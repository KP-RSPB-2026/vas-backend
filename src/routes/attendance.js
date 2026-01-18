const express = require('express');
const router = express.Router();
const { checkIn, checkOut, getHistory, getDetail } = require('../controllers/attendanceController');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');

/**
 * @route   POST /api/attendance/check-in
 * @desc    Check-in attendance with photo
 * @access  Private (User only)
 * @body    latitude, longitude, reason (optional, required if late)
 * @file    photo
 */
router.post('/check-in', authenticate, upload.single('photo'), checkIn);

/**
 * @route   POST /api/attendance/check-out
 * @desc    Check-out attendance with photo
 * @access  Private (User only)
 * @body    latitude, longitude, reason (optional, required if early)
 * @file    photo
 */
router.post('/check-out', authenticate, upload.single('photo'), checkOut);

/**
 * @route   GET /api/attendance/history
 * @desc    Get attendance history
 * @access  Private (User: own history, Admin: all)
 * @query   user_id (admin only), limit, offset, page, month, year
 *          - Pagination: use either offset+limit or page+limit
 *          - Filtering: when month (1-12) and year provided, results are
 *            constrained to that month in GMT+8 using the stored `date` field
 */
router.get('/history', authenticate, getHistory);

/**
 * @route   GET /api/attendance/detail/:id
 * @desc    Get attendance detail
 * @access  Private (User: own record, Admin: all)
 */
router.get('/detail/:id', authenticate, getDetail);

module.exports = router;
