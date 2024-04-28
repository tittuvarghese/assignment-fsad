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

module.exports = { registerUser, findUserByEmail };
