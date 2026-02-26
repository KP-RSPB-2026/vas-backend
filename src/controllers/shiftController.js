const pool = require('../config/db');

const listShifts = async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT id, code, name, start_time, end_time FROM shifts ORDER BY code ASC');
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('List shifts error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

module.exports = { listShifts };