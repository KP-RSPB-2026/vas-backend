const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const routes = require('./routes');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();

// Security middleware
app.use(helmet());

// Rate limiting
const isDev = process.env.NODE_ENV !== 'production';
const devWhitelistedIps = ['127.0.0.1', '::1', '10.0.2.2'];

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 0 : 100, // 0 disables in dev
  message: 'Too many requests from this IP, please try again later.',
  keyGenerator: (req) => (req.user?.id ? `user:${req.user.id}` : req.ip),
  skip: (req) => isDev || devWhitelistedIps.includes(req.ip),
});
app.use('/api/', limiter);

// CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : '*',
  credentials: true,
}));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Routes
app.use('/api', routes);

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'VAS Attendance System API',
    version: '1.0.0',
    documentation: '/api/health',
  });
});

// 404 handler
app.use(notFound);

// Error handler
app.use(errorHandler);

module.exports = app;
