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
    const [rows] = await pool.execute(query, [...queryParams, offset, pageSize]);

    return rows;
  } catch (error) {
    console.error('Error fetching content details:', error);
    throw error;
  }
};

const questionsQuery = async (languageId, count, difficultyLevel, connection) => {
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
  console.log(rows)
  return rows;
};

const assesmentInsertQuery = async (assessmentId, userId, startTime, endTime, durationAllowed, connection) => {
  // Construct insert query
  const query = `
    INSERT INTO assessment (assessment_id, user_id, start_time, end_time, duration_allowed)
    VALUES (?, ?, ?, ?, ?);
  `;
  await connection.execute(query, [assessmentId, userId, startTime, endTime, durationAllowed]);
};

const assesmentQuestionsInsert = async (questions, assessmentId, connection) => {
  if (questions.length === 0) {
    throw new Error('No questions to insert');
  }

  // Generate placeholders for the values
  const placeholders = questions.map(() => '(?, ?, ?)').join(', ');

  // Extract values from questions
  const values = questions.flatMap(question => [assessmentId, question.content_id, question.weightage]);

  // Construct insert query
  const query = `
    INSERT INTO assessment_questions (assessment_id, question_id, weightage)
    VALUES ${placeholders};
  `;

  await connection.execute(query, values);
};

module.exports = { pool, registerUser, findUserByEmail, insertLanguageDetails, fetchSupportedLanguages, insertContent, getContentDetails, questionsQuery, assesmentInsertQuery, assesmentQuestionsInsert };
