const path = require('path');
const fs = require('fs/promises');
const pool = require('../config/db');
const { ATTENDANCE_STATUS } = require('../config/constants');
const { isWithinRadius } = require('../utils/location');
const { getCurrentTimeGMT8, isLateCheckIn, isEarlyCheckOut, getTodayDate } = require('../utils/time');

async function getActiveOfficeLocation() {
  const [rows] = await pool.execute('SELECT latitude, longitude, radius FROM office_location WHERE is_active = 1 LIMIT 1');
  return rows[0];
}

async function savePhoto(file, userId, date, label) {
  const ext = path.extname(file.originalname || '') || '.jpg';
  const dir = path.join(__dirname, '..', '..', 'uploads', String(userId), date);
  await fs.mkdir(dir, { recursive: true });
  const filename = `${label}-${Date.now()}${ext}`;
  const filepath = path.join(dir, filename);
  await fs.writeFile(filepath, file.buffer);
  const publicPath = `/uploads/${userId}/${date}/${filename}`;
  return { filepath, publicPath };
}

/**
 * Check-in attendance
 */
const checkIn = async (req, res) => {
  try {
    const userId = req.user.id;
    const { latitude, longitude, reason } = req.body;
    const photo = req.file;

    // Validate input
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required',
      });
    }

    if (!photo) {
      return res.status(400).json({
        success: false,
        error: 'Photo is required',
      });
    }

    const userLat = parseFloat(latitude);
    const userLon = parseFloat(longitude);

    const officeLocation = await getActiveOfficeLocation();
    if (!officeLocation) {
      return res.status(500).json({ success: false, error: 'Office location not configured' });
    }

    const officeLat = parseFloat(officeLocation.latitude);
    const officeLon = parseFloat(officeLocation.longitude);
    const officeRadius = parseInt(officeLocation.radius);

    if (!isWithinRadius(userLat, userLon, officeLat, officeLon, officeRadius)) {
      return res.status(400).json({
        success: false,
        error: 'You are not within the office area',
      });
    }

    const today = getTodayDate();
    const [existingRows] = await pool.execute(
      'SELECT id FROM attendance WHERE user_id = ? AND date = ? LIMIT 1',
      [userId, today]
    );

    if (existingRows.length) {
      return res.status(400).json({ success: false, error: 'Already checked in today' });
    }

    // Use server time in GMT+8 timezone - CANNOT BE MANIPULATED BY CLIENT!
    const now = getCurrentTimeGMT8().toDate();
    const isLate = isLateCheckIn(now);

    // Validate reason if late
    if (isLate && (!reason || reason.trim() === '')) {
      return res.status(400).json({
        success: false,
        error: 'Reason is required for late check-in',
      });
    }

    const saved = await savePhoto(photo, userId, today, 'check-in');
    const status = isLate ? ATTENDANCE_STATUS.LATE : ATTENDANCE_STATUS.CHECKED_IN;

    const [insertResult] = await pool.execute(
      `INSERT INTO attendance
        (user_id, date, status, check_in_time, check_in_photo_url, check_in_latitude, check_in_longitude, check_in_reason, is_late, is_early)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [userId, today, status, now, saved.publicPath, userLat, userLon, isLate ? reason : null, isLate ? 1 : 0]
    );

    const insertedId = insertResult.insertId;
    const [attendanceRows] = await pool.execute('SELECT * FROM attendance WHERE id = ?', [insertedId]);
    const attendance = attendanceRows[0];

    return res.status(201).json({
      success: true,
      data: {
        attendance,
        isLate,
        message: isLate ? 'Checked in late' : 'Checked in successfully',
      },
    });
  } catch (error) {
    console.error('Check-in error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

/**
 * Check-out attendance
 */
const checkOut = async (req, res) => {
  try {
    const userId = req.user.id;
    const { latitude, longitude, reason } = req.body;
    const photo = req.file;

    // Validate input
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required',
      });
    }

    if (!photo) {
      return res.status(400).json({
        success: false,
        error: 'Photo is required',
      });
    }

    const userLat = parseFloat(latitude);
    const userLon = parseFloat(longitude);

    const officeLocation = await getActiveOfficeLocation();
    if (!officeLocation) {
      return res.status(500).json({ success: false, error: 'Office location not configured' });
    }

    const officeLat = parseFloat(officeLocation.latitude);
    const officeLon = parseFloat(officeLocation.longitude);
    const officeRadius = parseInt(officeLocation.radius);

    if (!isWithinRadius(userLat, userLon, officeLat, officeLon, officeRadius)) {
      return res.status(400).json({
        success: false,
        error: 'You are not within the office area',
      });
    }

    const today = getTodayDate();
    const [attendanceRows] = await pool.execute(
      'SELECT * FROM attendance WHERE user_id = ? AND date = ? LIMIT 1',
      [userId, today]
    );

    const attendance = attendanceRows[0];
    if (!attendance) {
      return res.status(400).json({ success: false, error: 'No check-in record found for today' });
    }

    if (attendance.check_out_time) {
      return res.status(400).json({ success: false, error: 'Already checked out today' });
    }

    // Use server time in GMT+8 timezone - CANNOT BE MANIPULATED BY CLIENT!
    const now = getCurrentTimeGMT8().toDate();
    const isEarly = isEarlyCheckOut(now);

    // Validate reason if early
    if (isEarly && (!reason || reason.trim() === '')) {
      return res.status(400).json({
        success: false,
        error: 'Reason is required for early check-out',
      });
    }

    const saved = await savePhoto(photo, userId, today, 'check-out');

    let finalStatus = ATTENDANCE_STATUS.COMPLETED;
    if (attendance.status === ATTENDANCE_STATUS.LATE) finalStatus = ATTENDANCE_STATUS.LATE;
    if (isEarly) finalStatus = ATTENDANCE_STATUS.EARLY_LEAVE;

    await pool.execute(
      `UPDATE attendance SET
        check_out_time = ?,
        check_out_photo_url = ?,
        check_out_latitude = ?,
        check_out_longitude = ?,
        check_out_reason = ?,
        status = ?,
        is_early = ?
       WHERE id = ?`,
      [
        now,
        saved.publicPath,
        userLat,
        userLon,
        isEarly ? reason : null,
        finalStatus,
        isEarly ? 1 : 0,
        attendance.id,
      ]
    );

    const [updatedRows] = await pool.execute('SELECT * FROM attendance WHERE id = ?', [attendance.id]);
    const updatedAttendance = updatedRows[0];

    return res.status(200).json({
      success: true,
      data: {
        attendance: updatedAttendance,
        isEarly,
        message: isEarly ? 'Checked out early' : 'Checked out successfully',
      },
    });
  } catch (error) {
    console.error('Check-out error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

/**
 * Get attendance history
 */
const getHistory = async (req, res) => {
  try {
    const userId = req.user.role === 'admin' ? req.query.user_id : req.user.id;

    // Coerce numbers safely to avoid NaN/undefined reaching the query placeholders
    const parsedLimit = parseInt(req.query.limit, 10);
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 30;

    const parsedPage = parseInt(req.query.page, 10);
    const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : undefined;

    const parsedOffset = parseInt(req.query.offset, 10);
    const offset = Number.isFinite(parsedOffset)
      ? parsedOffset
      : (page ? (page - 1) * limit : 0);

    const parsedMonth = parseInt(req.query.month, 10);
    const parsedYear = parseInt(req.query.year, 10);
    const month = Number.isFinite(parsedMonth) ? parsedMonth : undefined;
    const year = Number.isFinite(parsedYear) ? parsedYear : undefined;

    const includePhotos = req.query.include_photos !== 'false';

    const filters = [];
    const params = [];
    if (userId) {
      filters.push('user_id = ?');
      params.push(userId);
    }
    if (month !== undefined && year !== undefined) {
      filters.push('MONTH(date) = ? AND YEAR(date) = ?');
      params.push(month, year);
    }

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    // Guard: LIMIT/OFFSET must be non-negative integers
    const safeLimit = limit < 0 ? 30 : limit;
    const safeOffset = offset < 0 ? 0 : offset;

    const sqlParams = [...params];
    const sql = `SELECT * FROM attendance ${where} ORDER BY date DESC LIMIT ${safeLimit} OFFSET ${safeOffset}`;
    console.log('getHistory params:', {
      where,
      params,
      safeLimit,
      safeOffset,
      sql,
    });

    const [rows] = await pool.execute(sql, sqlParams);

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total FROM attendance ${where}`,
      params
    );
    const total = countRows[0]?.total ?? 0;
    const hasMore = safeOffset + rows.length < total;

    const mapped = rows.map((row) => ({
      ...row,
      check_in_photo_url: includePhotos ? row.check_in_photo_url : null,
      check_out_photo_url: includePhotos ? row.check_out_photo_url : null,
      is_late_check_in: !!row.is_late,
      is_early_check_out: !!row.is_early,
    }));

    return res.status(200).json({
      success: true,
      data: mapped,
      meta: {
        page: page ?? (Number.isFinite(parsedOffset) ? Math.floor(parsedOffset / safeLimit) + 1 : 1),
        limit: safeLimit,
        offset: safeOffset,
        total,
        hasMore,
        month,
        year,
      },
    });
  } catch (error) {
    console.error('Get history error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

/**
 * Get attendance detail
 */
const getDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    const [rows] = await pool.execute('SELECT * FROM attendance WHERE id = ?', [id]);
    const attendance = rows[0];

    if (!attendance) {
      return res.status(404).json({ success: false, error: 'Attendance record not found' });
    }

    if (!isAdmin && String(attendance.user_id) !== String(userId)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const mapped = {
      ...attendance,
      is_late_check_in: !!attendance.is_late,
      is_early_check_out: !!attendance.is_early,
    };

    return res.status(200).json({ success: true, data: mapped });
  } catch (error) {
    console.error('Get detail error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

module.exports = {
  checkIn,
  checkOut,
  getHistory,
  getDetail,
};
