const express = require('express');
const router = express.Router();
const { validateLocation } = require('../controllers/locationController');
const { authenticate } = require('../middleware/auth');

/**
 * @route   GET /api/location/validate
 * @desc    Validate if user is within office location
 * @access  Private
 * @query   latitude, longitude
 */
router.get('/validate', authenticate, validateLocation);

module.exports = router;
