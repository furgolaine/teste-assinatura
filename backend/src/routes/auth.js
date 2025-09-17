const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { authValidation } = require('../middleware/validation');

// Public routes
router.post('/login', authValidation.login, authController.login);
router.post('/register', authValidation.register, authController.register);

// Protected routes
router.get('/profile', authenticateToken, authController.getProfile);

module.exports = router;

