const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const uuid = require('uuid');
const { pool, registerUser, findUserByEmail, insertLanguageDetails, fetchSupportedLanguages, insertContent, getContentDetails, questionsQuery, assesmentInsertQuery, assesmentQuestionsInsert, getUserAssessments, validateUserAnswer, updateAssessmentProgress, createChallenge, challengeInsertQuery, getAllChallenges } = require('./db');
const { JWT_TOKEN } = require('./constants');
const { validateJwtSignature, validateJwtSignatureAdmin } = require('./middleware/validateJwtSignature');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(bodyParser.json());

// Register endpoint
app.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, userType } = req.body;

    // Generate a unique user ID
    const user_id = uuid.v4();

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user into database
    await registerUser(user_id, email, hashedPassword, firstName, lastName, userType);

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ status: false, error: 'Internal server error', message: error.message, data: error });
  }
});

// Login endpoint
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Retrieve user from database
    const [user] = await findUserByEmail(email);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ status: false, message: 'Invalid credentials', error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.user_id, email: user.email, userType: user.user_type },
      JWT_TOKEN,
      { expiresIn: '1000000h' }
    );

    res.status(200).json({
      status: true,
      message: 'Login successful',
      userId: user.user_id,
      email: user.email,
      name: `${user.first_name} ${user.last_name}`,
      token: token
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ status: false, error: 'Internal server error', data: error });
  }
});

// Protecting the routes
app.use(validateJwtSignature);

// Route to handle fetching content details
app.get('/user/learning-materials', async (req, res) => {
  try {
    const { page = 1, pageSize = 10, sortBy = 'created_at', sortOrder = 'DESC', difficultyLevel, languageId, creatorId, contentType } = req.query;

    // Fetch content details
    const contentDetails = await getContentDetails(page, pageSize, sortBy, sortOrder, difficultyLevel, languageId, creatorId, contentType);

    res.status(200).json({ status: true, message: "Successfully retrieved the learning materials", data: contentDetails });
  } catch (error) {
    console.error('Error fetching content details:', error);
    res.status(500).json({ status: false, message: 'Internal server error' });
  }
});

app.get('/user/create-assessment', async (req, res) => {
  const userId = req.user.userId; // Assuming userId is provided in the query params
  const languageId = req.query.languageId;
  const count = req.query.count ? parseInt(req.query.count) : 5; // Default to 5 questions
  const difficultyLevel = req.query.difficultyLevel || "beginner"; // Default duration 30 minutes
  const durationAllowed = req.query.durationAllowed || 30; // Default duration 30 minutes
  const challengeId = req.query.challengeId || 0;
  let connection;
  try {
    connection = await pool.getConnection();

    await connection.beginTransaction();

    // Retrieve random questions from learning_materials table
    const questions = await questionsQuery(languageId, count, difficultyLevel, connection);

    // Create assessment entry
    const assessmentId = uuid.v4();
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + durationAllowed * 60000); // Convert duration to milliseconds
    await assesmentInsertQuery(languageId, assessmentId, userId, startTime, endTime, durationAllowed, difficultyLevel, challengeId, count, connection);
    await assesmentQuestionsInsert(questions, assessmentId, connection);

    await connection.commit();
    const assesmentQuestions = questions.map(question => ({
      content_id: question.content_id, // Assuming content_id is the ID of learning materials
      language_id: question.language_id,
      content_type: question.content_type,
      base_word: question.base_word,
      creator_id: question.creator_id,
      weightage: question.weightage,
      difficulty_level: question.difficulty_level,
      created_at: question.created_at,
      completed: false
    }));

    res.json({ status: true, message: "Successfully created the assessment", assessmentId, assesmentQuestions });
  } catch (error) {
    console.error('Error occurred:', error);
    if (connection) {
      await connection.rollback();
    }
    res.status(500).json({ status: false, error: 'Internal Server Error', message: error.message });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

app.get('/user/assessments', async (req, res) => {
  const userId = req.user.userId;
  console.log(req.user)
  try {
    const assesmentsByUser = await getUserAssessments(userId);
    res.status(200).json({ status: true, message: 'Successfully retrieved the assesments', results: assesmentsByUser });
  } catch (error) {
    console.error('Error fetching the assesments:', error);
    res.status(500).json({ status: false, message: error.message, error: 'Internal server error' });
  }

});

// POST /user/assessment-progress/:assessmentId endpoint
app.post('/user/assessment-progress/:assessmentId', async (req, res) => {
  const userId = req.user.userId;
  const assessmentId = req.params.assessmentId;
  const { contentId, userAnswer } = req.body;

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Validate user answer
    const isValid = await validateUserAnswer(assessmentId, contentId, userAnswer, connection);

    if (!isValid) {
      res.status(200).json({ status: false, message: 'Invalid user answer' });
      return;
    }

    // Update assessment progress
    await updateAssessmentProgress(assessmentId, connection);

    await connection.commit();
    res.status(200).json({ status: true, message: 'Assessment progress updated successfully' });
  } catch (error) {
    console.error('Error updating assessment progress:', error);
    if (connection) {
      await connection.rollback();
    }
    res.status(500).json({ status: false, message: error.message, error: 'Internal server error' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

app.get('/user/challenges', async (req, res) => {
  try {
    // Call getAllChallenges function to fetch all challenges with status
    const challenges = await getAllChallenges();
    res.status(200).json({ status: true, message: "Successfully retrieved all the challenges", challenges });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message, error: 'Internal server error' });
  }
});

app.use(validateJwtSignatureAdmin);

// Endpoint for admin to set up supported languages
app.post('/admin/languages', async (req, res) => {
  try {
    const { foreignLanguage, baseLanguage } = req.body;

    // Generate unique UUID for language id
    const languageId = uuid.v4();

    // Store language details in database
    const languageInsertQuery = await insertLanguageDetails(languageId, foreignLanguage, baseLanguage);

    res.status(201).json({ status: true, message: 'Language setup successful', languageId });
  } catch (error) {
    console.error('Error setting up language:', error);
    res.status(500).json({ status: false, message: error.message, error: 'Internal server error' });
  }
});

// Get all supported languages (for testing purposes)
app.get('/admin/languages', async (req, res) => {
  try {
    const supportedLanguages = await fetchSupportedLanguages();
    res.status(200).json({ status: true, message: 'Successfully retrieved the supported languages', results: supportedLanguages });
  } catch (error) {
    console.error('Error fetching supported languages:', error);
    res.status(500).json({ status: false, message: error.message, error: 'Internal server error' });
  }
});

// Route to handle learning material creation
app.post('/admin/learning-materials', async (req, res) => {
  const { language_id, content_type, content } = req.body;

  // Validate input
  if (!language_id || !content_type || !content || !Array.isArray(content)) {
    return res.status(400).json({ status: false, message: 'Invalid payload', error: 'Invalid payload' });
  }

  const insertPromises = [];


  // Iterate over each content item and insert into table
  // Iterate over each content item and insert into table
  for (const item of content) {
    let weightage = 1;
    let contentId = uuid.v4();
    if (content_type == "video") {
      weightage = 3;
    } else if (content_type == "image") {
      weightage = 2;
    }

    insertPromises.push(insertContent(contentId, language_id, content_type, item, weightage));
  }
  try {
    // Await all insert operations
    await Promise.all(insertPromises);
    res.status(200).json({ status: true, message: 'Successfully created the learning material' });

  } catch (error) {
    console.error('Error creating learning material:', error);
    res.status(500).json({ status: false, error: 'Internal server error', message: error.message });
  }

});


app.get('/admin/create-challenge', async (req, res) => {
  const userId = req.user.userId; // Assuming userId is provided in the query params
  const languageId = req.query.languageId;
  const challengeName = req.query.challengeName;
  const difficultyLevel = req.query.difficultyLevel || "beginner"; // Default duration 30 minutes
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;

  let connection;
  try {
    connection = await pool.getConnection();

    await connection.beginTransaction();

    // Create assessment entry
    const challengeId = uuid.v4();
    const startTime = new Date(startDate);
    const endTime = new Date(endDate);

    await challengeInsertQuery(challengeName, challengeId, languageId, userId, startTime, endTime, difficultyLevel, connection);

    await connection.commit();

    res.json({ status: true, message: "Successfully created the challenge", challengeId });
  } catch (error) {
    console.error('Error occurred:', error);
    if (connection) {
      await connection.rollback();
    }
    res.status(500).json({ status: false, error: 'Internal Server Error', message: error.message });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});


// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
