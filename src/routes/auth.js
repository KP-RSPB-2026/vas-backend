const express = require('express');
const router = express.Router();
const { login, logout, changePassword, refreshToken } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', login);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Public
 */
router.post('/logout', logout);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change password for current user
 * @access  Private (requires access token)
 */
router.post('/change-password', authenticate, changePassword);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public (requires valid refresh token)
 */
router.post('/refresh', refreshToken);

module.exports = router;
