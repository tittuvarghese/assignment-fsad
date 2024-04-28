const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const uuid = require('uuid');
const { registerUser, findUserByEmail } = require('./db');
const { JWT_TOKEN } = require('./constants');
const validateJwtSignature = require('./middleware/validateJwtSignature');

const app = express();
const PORT = process.env.PORT || 3000;

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
    res.status(500).json({ status: false, error: 'Internal server error', message: error.message,  data: error });
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
      return res.status(401).json({ status: false, message: 'Invalid credentials',error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.user_id, email: user.email, userType: user.user_type },
      JWT_TOKEN,
      { expiresIn: '1h' }
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

app.get('/protected', (req, res) => {
    res.json({ message: 'Protected route accessed successfully', user: req.user });
});


// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
