const pool = require('../config/db');
const { verifyAccessToken } = require('../utils/jwt');

/**
 * Middleware to verify JWT token
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }

    const [rows] = await pool.execute('SELECT id, nomor_karyawan, nama AS name, role FROM users WHERE id = ?', [decoded.sub]);
    if (!rows.length) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    req.user = {
      id: String(rows[0].id),
      nomor_karyawan: rows[0].nomor_karyawan,
      name: rows[0].name,
      role: rows[0].role,
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error during authentication' });
  }
};

/**
 * Middleware to check if user is admin
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Access denied. Admin role required.' });
  }
  next();
};

module.exports = {
  authenticate,
  requireAdmin,
};
