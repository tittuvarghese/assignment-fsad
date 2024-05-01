const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'app-user',
  password: 'app-user-password',
  database: 'language-learning-db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function registerUser(user_id, email, hashedPassword, firstName, lastName, userType) {
  const [result] = await pool.query(`
    INSERT INTO users (user_id, email, password, first_name, last_name, user_type)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [user_id, email, hashedPassword, firstName, lastName, userType]);

  return result;
}

async function findUserByEmail(email) {
  const [rows] = await pool.query(`
    SELECT user_id, email, password, first_name, last_name, user_type
    FROM users
    WHERE email = ?
  `, [email]);

  return rows;
}

async function insertLanguageDetails(languageId, foreignLanguage, baseLanguage) {
  const connection = await pool.getConnection();
  try {
    await connection.execute(
      'INSERT INTO supported_languages (language_id, foreign_language, base_language) VALUES (?, ?, ?)',
      [languageId, foreignLanguage, baseLanguage]
    );
    return languageId;
  } finally {
    connection.release();
  }
}

// Function to fetch supported languages from MySQL table
async function fetchSupportedLanguages() {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute('SELECT * FROM supported_languages');
    return rows;
  } finally {
    connection.release();
  }
}

// Function to insert a single content item
const insertContent = async (content_id, language_id, contentType, item, weightage) => {
  const connection = await pool.getConnection();
  try {
    // Construct insert query
    const query = `
      INSERT INTO learning_materials (content_id, language_id, content_type, foreign_word, base_word, creator_id, difficulty_level, weightage)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    // Execute insert query
    await connection.execute(query, [content_id, language_id, contentType, item.foreign_word, item.base_word, item.creator_id, item.difficulty_level, weightage]);
    console.log('Content inserted successfully');
    return true; // Resolve promise indicating successful insertion
  } catch (error) {
    console.error('Error inserting content: ' + error);
    // Reject promise with the error
    throw error;
  } finally {
    connection.release(); // Release connection back to the pool
  }
};

// Function to fetch content details with pagination, sorting, and filtering
const getContentDetails = async (page, pageSize, sortBy, sortOrder, difficultyLevel, languageId, creatorId, contentType) => {
  const connection = await pool.getConnection();
  try {
    // Construct WHERE clause for filtering
    let whereClause = 'WHERE 1=1';
    const queryParams = [];

    if (contentType) {
      whereClause += ' AND content_type = ?';
      queryParams.push(contentType);
    }

    if (difficultyLevel) {
      whereClause += ' AND difficulty_level = ?';
      queryParams.push(difficultyLevel);
    }

    if (languageId) {
      whereClause += ' AND language_id = ?';
      queryParams.push(languageId);
    }

    if (creatorId) {
      whereClause += ' AND creator_id = ?';
      queryParams.push(creatorId);
    }

    // Construct ORDER BY clause for sorting
    let orderByClause = '';
    if (sortBy && sortOrder) {
      orderByClause = `ORDER BY ${sortBy} ${sortOrder}`;
    }

    // Calculate pagination offset
    const offset = (page - 1) * pageSize;

    // Construct SQL query
    const query = `
      SELECT *
      FROM learning_materials
      ${whereClause}
      ${orderByClause}
      LIMIT ?, ?
    `;

    // Execute SQL query
    const [rows] = await connection.execute(query, [...queryParams, offset, pageSize]);

    return rows;
  } catch (error) {
    console.error('Error fetching content details:', error);
    throw error;
  }
};

const questionsQuery = async (languageId, count, difficultyLevel, connection) => {
  try {

    let whereClause = 'WHERE 1=1';
    const queryParams = [];

    if (difficultyLevel) {
      whereClause += ' AND difficulty_level = ?';
      queryParams.push(difficultyLevel);
    }

    if (languageId) {
      whereClause += ' AND language_id = ?';
      queryParams.push(languageId);
    }

    // Construct SQL query
    const query = `
      SELECT *
      FROM learning_materials
      ${whereClause}
      ORDER BY RAND()
      LIMIT ?
    `;
    const [rows] = await connection.execute(query, [...queryParams, count]);
    return rows;
  } catch (error) {
    console.error('Error fetching content details:', error);
    throw error;
  }
};

const assesmentInsertQuery = async (languageId, assessmentId, userId, startTime, endTime, durationAllowed, difficultyLevel, challengeId, questonsCount, connection) => {

  if (challengeId != 0) {

    const countQuery = `
      SELECT count(assessment_id) AS count
      FROM assessment WHERE user_id = ? AND challenge_id = ?
    `;
    // Execute SQL query
    const [rows] = await connection.execute(countQuery, [userId, challengeId]);

    // Extract count from the result
    const count = rows[0].count;
    if (count > 0) {
      throw new Error('User cannot register same challenge again');
    }

  }

  // Construct insert query
  const query = `
    INSERT INTO assessment (language_id, assessment_id, user_id, start_time, end_time, duration_allowed,difficulty_level, challenge_id, total_questions)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
  `;
  await connection.execute(query, [languageId, assessmentId, userId, startTime, endTime, durationAllowed, difficultyLevel, challengeId, questonsCount]);
};

const assesmentQuestionsInsert = async (questions, assessmentId, connection) => {
  if (questions.length === 0) {
    throw new Error('No questions to insert');
  }

  // Generate placeholders for the values
  const placeholders = questions.map(() => '(?, ?, ?, ?, ?)').join(', ');

  // Extract values from questions
  const values = questions.flatMap(question => [assessmentId, question.content_id, question.weightage, question.base_word, question.foreign_word]);

  // Construct insert query
  const query = `
    INSERT INTO assessment_questions (assessment_id, question_id, weightage, base_word, foreign_word)
    VALUES ${placeholders};
  `;

  await connection.execute(query, values);
};

const getUserAssessments = async (userId) => {
  const connection = await pool.getConnection();
  try {
    // Query to retrieve user assessments with aggregated assessment questions
    const query = `
      SELECT a.assessment_id, a.start_time, a.end_time, a.duration_allowed,
             a.difficulty_level, a.progress,
             sl.foreign_language AS foreign_language,
             sl.base_language AS base_language,
             JSON_ARRAYAGG(JSON_OBJECT(
               'question_id', aq.question_id,
               'base_word', lm.base_word,
               'content_type', lm.content_type,
               'weightage', aq.weightage,
               'completed', aq.completed
             )) AS questions
      FROM assessment AS a
      INNER JOIN supported_languages AS sl ON a.language_id = sl.language_id
      LEFT JOIN (
        SELECT assessment_id, question_id, weightage, completed
        FROM assessment_questions
      ) AS aq ON a.assessment_id = aq.assessment_id
      LEFT JOIN learning_materials AS lm ON aq.question_id = lm.content_id
      WHERE a.user_id = ?
      GROUP BY a.assessment_id
    `;

    const [rows] = await connection.execute(query, [userId]);

    return rows.map(row => ({
      ...row,
      questions: row.questions ? JSON.parse(row.questions) : []
    }));
  } catch (error) {
    console.error('Error fetching user assessments:', error);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
};


// Function to update assessment progress
async function updateAssessmentProgress(assessmentId, connection) {
  const updateQuery = `
    UPDATE assessment
    SET progress = progress + 1
    WHERE assessment_id = ?;
  `;
  const params = [assessmentId];

  try {
    await connection.execute(updateQuery, params);
    console.log("Assessment progress updated successfully");
    return true;
  } catch (error) {
    console.error('Error updating assessment progress:', error);
    throw error;
  }
}
// Function to validate user answer using assessment_questions table
async function validateUserAnswer(assessmentId, contentId, userAnswer, connection) {
  const selectQuery = `
    SELECT question_id
    FROM assessment_questions
    WHERE assessment_id = ? AND question_id = ? AND foreign_word = ? AND completed = false;
  `;
  const updateQuery = `
    UPDATE assessment_questions
    SET completed = true
    WHERE assessment_id = ? AND question_id = ?;
  `;

  try {

    // Execute select query
    const [selectResults] = await connection.execute(selectQuery, [assessmentId, contentId, userAnswer]);
    const isValid = selectResults.length > 0;

    if (isValid) {
      // Execute update query
      await connection.execute(updateQuery, [assessmentId, contentId]);
    } else {
      return false;
    }

    return isValid;
  } catch (error) {
    throw error;
  }
}

const challengeInsertQuery = async (challengeName, challengeId, languageId, created_by, startTime, endTime, difficultyLevel, connection) => {
  // Construct insert query
  const query = `
    INSERT INTO challenges (challenge_name,challenge_id,language_id, created_by, start_time, end_time,difficulty_level)
    VALUES (?, ?, ?, ?, ?, ?, ?);
  `;
  await connection.execute(query, [challengeName, challengeId, languageId, created_by, startTime, endTime, difficultyLevel]);
};


const getAllChallenges = async () => {
  const connection = await pool.getConnection();
  try {

    try {
      const [challenges] = await connection.execute('SELECT * FROM challenges WHERE challenge_id != "0" ORDER BY end_time DESC');

      const currentDate = new Date();
      const challengesWithStatus = challenges.map(challenge => {
        const endDate = new Date(challenge.end_time);
        const status = endDate < currentDate ? 'Completed' : 'Ongoing';
        return { ...challenge, status };
      });

      return challengesWithStatus;

    } finally {
      connection.release();
    }
  } catch (error) {
    throw error;
  }
}


module.exports = {
  pool, registerUser, findUserByEmail, insertLanguageDetails, fetchSupportedLanguages, insertContent, getContentDetails, questionsQuery, assesmentInsertQuery, assesmentQuestionsInsert, getUserAssessments, updateAssessmentProgress, validateUserAnswer, challengeInsertQuery, getAllChallenges
};
