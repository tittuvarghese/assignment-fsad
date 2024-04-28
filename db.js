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
const insertContent = async (content_id, language_id, contentType, item) => {
  const connection = await pool.getConnection();
  try {
    // Construct insert query
    const query = `
      INSERT INTO learning_materials (content_id, language_id, content_type, foreign_word, base_word, creator_id, difficulty_level)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    // Execute insert query
    await connection.execute(query, [content_id, language_id, contentType, item.foreign_word, item.base_word, item.creator_id, item.difficulty_level]);
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

module.exports = { registerUser, findUserByEmail, insertLanguageDetails, fetchSupportedLanguages, insertContent };
