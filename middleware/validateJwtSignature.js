const jwt = require('jsonwebtoken');
const expressJwt = require('express-jwt');
const { JWT_TOKEN } = require('../constants');

// Middleware to validate JWT signature
const validateJwtSignature = (req, res, next) => {
  // Get the token from the request headers, query string, or cookies
  const token = req.headers.authorization?.split(' ')[1] || req.query?.token || req.cookies?.token;

  if (!token) {
    return res.status(401).json({ status: false, message: 'Unauthorized: No token provided', error: 'Unauthorized: No token provided' });
  }

  // Verify the JWT token
  jwt.verify(token, JWT_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
    // Store the decoded token payload for use in subsequent middleware or routes
    req.user = decoded;
    next();
  });
};

module.exports = validateJwtSignature;
