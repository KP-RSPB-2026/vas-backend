const express = require('express');
const authRoutes = require('./auth');
const locationRoutes = require('./location');
const attendanceRoutes = require('./attendance');
const userRoutes = require('./users');
const shiftRoutes = require('./shifts');

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});

// Routes
router.use('/auth', authRoutes);
router.use('/location', locationRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/users', userRoutes);
router.use('/shifts', shiftRoutes);

module.exports = router;
