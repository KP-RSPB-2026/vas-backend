const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  ACCESS_EXPIRES_IN,
  REFRESH_EXPIRES_IN,
} = require('../utils/jwt');

/**
 * Login user with nomor_karyawan and password
 */
const login = async (req, res) => {
  try {
    const { nomor_karyawan, password } = req.body;

    if (!nomor_karyawan || !password) {
      return res.status(400).json({ success: false, error: 'Nomor karyawan dan password wajib diisi' });
    }

    const [rows] = await pool.execute(
      'SELECT id, nomor_karyawan, nama AS name, role, password_hash FROM users WHERE nomor_karyawan = ?',
      [nomor_karyawan]
    );

    if (!rows.length) {
      return res.status(401).json({ success: false, error: 'Nomor karyawan atau password salah' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ success: false, error: 'Nomor karyawan atau password salah' });
    }

    const payload = { sub: user.id, role: user.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await pool.execute(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? SECOND))',
      [user.id, refreshToken, REFRESH_EXPIRES_IN]
    );

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: String(user.id),
          nomor_karyawan: user.nomor_karyawan,
          name: user.name,
          role: user.role,
        },
        session: {
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_in: ACCESS_EXPIRES_IN,
          expires_at: Math.floor(Date.now() / 1000) + ACCESS_EXPIRES_IN,
        },
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

/**
 * Logout user (invalidate refresh token)
 */
const logout = async (req, res) => {
  try {
    const { refresh_token: refreshToken } = req.body || {};
    if (!refreshToken) {
      return res.status(400).json({ success: false, error: 'refresh_token wajib dikirim' });
    }

    try {
      const decoded = verifyRefreshToken(refreshToken);
      await pool.execute('DELETE FROM refresh_tokens WHERE user_id = ? AND token = ?', [decoded.sub, refreshToken]);
    } catch (_) {
      // ignore invalid token, treat as logged out
    }

    return res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

/**
 * Refresh access token using a valid refresh token
 */
const refreshToken = async (req, res) => {
  try {
    const { refresh_token: refreshTokenValue } = req.body || {};
    if (!refreshTokenValue) {
      return res.status(400).json({ success: false, error: 'refresh_token wajib dikirim' });
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshTokenValue);
    } catch (_) {
      return res.status(401).json({ success: false, error: 'Refresh token tidak valid atau kedaluwarsa' });
    }

    const userId = decoded.sub;

    // Pastikan refresh token masih tercatat dan belum kedaluwarsa di DB
    const [rows] = await pool.execute(
      'SELECT user_id FROM refresh_tokens WHERE user_id = ? AND token = ? AND expires_at > UTC_TIMESTAMP()',
      [userId, refreshTokenValue]
    );

    if (!rows.length) {
      return res.status(401).json({ success: false, error: 'Refresh token tidak valid atau kedaluwarsa' });
    }

    // Ambil user terkini untuk memastikan masih ada
    const [userRows] = await pool.execute(
      'SELECT id, nomor_karyawan, nama AS name, role FROM users WHERE id = ?',
      [userId]
    );

    if (!userRows.length) {
      return res.status(404).json({ success: false, error: 'User tidak ditemukan' });
    }

    const user = userRows[0];

    // Rolling refresh: hapus token lama, buat yang baru
    await pool.execute('DELETE FROM refresh_tokens WHERE user_id = ? AND token = ?', [userId, refreshTokenValue]);

    const payload = { sub: user.id, role: user.role };
    const newAccessToken = signAccessToken(payload);
    const newRefreshToken = signRefreshToken(payload);

    await pool.execute(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? SECOND))',
      [user.id, newRefreshToken, REFRESH_EXPIRES_IN]
    );

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: String(user.id),
          nomor_karyawan: user.nomor_karyawan,
          name: user.name,
          role: user.role,
        },
        session: {
          access_token: newAccessToken,
          refresh_token: newRefreshToken,
          expires_in: ACCESS_EXPIRES_IN,
          expires_at: Math.floor(Date.now() / 1000) + ACCESS_EXPIRES_IN,
        },
      },
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

/**
 * Change password for the authenticated user
 */
const changePassword = async (req, res) => {
  try {
    const { current_password: currentPassword, new_password: newPassword } = req.body || {};

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'current_password dan new_password wajib diisi' });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({ success: false, error: 'Password baru minimal 6 karakter' });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ success: false, error: 'Password baru tidak boleh sama dengan password lama' });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const [rows] = await pool.execute('SELECT password_hash FROM users WHERE id = ?', [userId]);
    if (!rows.length) {
      return res.status(404).json({ success: false, error: 'User tidak ditemukan' });
    }

    const match = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!match) {
      return res.status(401).json({ success: false, error: 'Password lama salah' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.execute('UPDATE users SET password_hash = ? WHERE id = ?', [hashed, userId]);

    // Revoke existing refresh tokens to force re-login everywhere
    await pool.execute('DELETE FROM refresh_tokens WHERE user_id = ?', [userId]);

    return res.status(200).json({ success: true, message: 'Password berhasil diperbarui. Silakan login kembali.' });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

module.exports = {
  login,
  logout,
  changePassword,
  refreshToken,
};
