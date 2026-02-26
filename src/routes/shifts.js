const express = require('express');
const router = express.Router();
const { listShifts } = require('../controllers/shiftController');
const { authenticate } = require('../middleware/auth');

// GET /api/shifts
router.get('/', authenticate, listShifts);

module.exports = router;