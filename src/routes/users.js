const express = require('express');
const router = express.Router();
const { getAllUsers } = require('../controllers/userController');
const { authenticate, requireAdmin } = require('../middleware/auth');

/**
 * @route   GET /api/users
 * @desc    Get all users
 * @access  Private (Admin only)
 * @query   role (optional filter)
 */
router.get('/', authenticate, requireAdmin, getAllUsers);

module.exports = router;
