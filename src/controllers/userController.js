const pool = require('../config/db');

/**
 * Get all users (Admin only)
 */
const getAllUsers = async (req, res) => {
  try {
    const role = req.query.role;
    const search = req.query.search;

    const parsedLimit = parseInt(req.query.limit, 10);
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 20;

    const parsedPage = parseInt(req.query.page, 10);
    const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

    const offset = (page - 1) * limit;

    const filters = [];
    const params = [];
    if (role) {
      const roleLower = role.toLowerCase();
      // For "user" role, include common variants and also rows where role is null/empty (legacy data)
      if (roleLower === 'user') {
        filters.push(`(
          role IS NULL
          OR TRIM(role) = ''
          OR LOWER(role) IN (?, ?, ?, ?, ?)
        )`);
        params.push('user', 'karyawan', 'employee', 'pegawai', 'staff');
      } else {
        filters.push('LOWER(role) = ?');
        params.push(roleLower);
      }
    }
    if (search) {
      filters.push('nama LIKE ?');
      params.push(`%${search}%`);
    }

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const sql = `SELECT id, nomor_karyawan, nama AS name, role, created_at FROM users ${where} ORDER BY nama ASC LIMIT ${limit} OFFSET ${offset}`;
    const [rows] = await pool.execute(sql, params);

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total FROM users ${where}`,
      params
    );
    const total = countRows[0]?.total ?? rows.length;
    const hasMore = offset + rows.length < total;

    return res.status(200).json({
      success: true,
      data: rows,
      meta: { page, limit, total, hasMore },
    });
  } catch (error) {
    console.error('Get all users error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

module.exports = {
  getAllUsers,
};
