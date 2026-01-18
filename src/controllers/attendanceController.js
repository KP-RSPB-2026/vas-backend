const { supabase, supabaseAdmin } = require('../config/supabase');
const { ATTENDANCE_STATUS } = require('../config/constants');
const { isWithinRadius } = require('../utils/location');
const { getCurrentTimeGMT8, isLateCheckIn, isEarlyCheckOut, getTodayDate, TIMEZONE } = require('../utils/time');
const moment = require('moment-timezone');
const { v4: uuidv4 } = require('uuid');

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

    // Get active office location from database
    const { data: officeLocation, error: officeError } = await supabase
      .from('office_location')
      .select('*')
      .eq('is_active', true)
      .single();

    if (officeError || !officeLocation) {
      return res.status(500).json({
        success: false,
        error: 'Office location not configured',
      });
    }

    // Validate location
    const officeLat = parseFloat(officeLocation.latitude);
    const officeLon = parseFloat(officeLocation.longitude);
    const officeRadius = parseInt(officeLocation.radius);

    if (!isWithinRadius(userLat, userLon, officeLat, officeLon, officeRadius)) {
      return res.status(400).json({
        success: false,
        error: 'You are not within the office area',
      });
    }

    // Check if already checked in today (using GMT+8 date)
    const today = getTodayDate();
    const { data: existingAttendance } = await supabase
      .from('attendances')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        error: 'Already checked in today',
      });
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

    // Upload photo to Supabase Storage
    const fileExt = photo.originalname.split('.').pop();
    const fileName = `${userId}/${today}/check-in-${uuidv4()}.${fileExt}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('attendance-photos')
      .upload(fileName, photo.buffer, {
        contentType: photo.mimetype,
        upsert: false,
      });

    if (uploadError) {
      console.error('Photo upload error:', uploadError);
      return res.status(500).json({
        success: false,
        error: 'Failed to upload photo',
      });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('attendance-photos')
      .getPublicUrl(fileName);

    // Insert attendance record
    const { data: attendance, error: insertError } = await supabase
      .from('attendances')
      .insert({
        user_id: userId,
        check_in_time: now.toISOString(),
        check_in_photo_url: publicUrl,
        check_in_latitude: userLat,
        check_in_longitude: userLon,
        check_in_reason: isLate ? reason : null,
        status: isLate ? ATTENDANCE_STATUS.LATE : ATTENDANCE_STATUS.CHECKED_IN,
        date: today,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert attendance error:', insertError);
      return res.status(500).json({
        success: false,
        error: 'Failed to create attendance record',
      });
    }

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

    // Get active office location from database
    const { data: officeLocation, error: officeError } = await supabase
      .from('office_location')
      .select('*')
      .eq('is_active', true)
      .single();

    if (officeError || !officeLocation) {
      return res.status(500).json({
        success: false,
        error: 'Office location not configured',
      });
    }

    // Validate location
    const officeLat = parseFloat(officeLocation.latitude);
    const officeLon = parseFloat(officeLocation.longitude);
    const officeRadius = parseInt(officeLocation.radius);

    if (!isWithinRadius(userLat, userLon, officeLat, officeLon, officeRadius)) {
      return res.status(400).json({
        success: false,
        error: 'You are not within the office area',
      });
    }

    // Get today's attendance
    const today = getTodayDate();
    const { data: attendance, error: fetchError } = await supabase
      .from('attendances')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    if (fetchError || !attendance) {
      return res.status(400).json({
        success: false,
        error: 'No check-in record found for today',
      });
    }

    if (attendance.check_out_time) {
      return res.status(400).json({
        success: false,
        error: 'Already checked out today',
      });
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

    // Upload photo to Supabase Storage
    const fileExt = photo.originalname.split('.').pop();
    const fileName = `${userId}/${today}/check-out-${uuidv4()}.${fileExt}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('attendance-photos')
      .upload(fileName, photo.buffer, {
        contentType: photo.mimetype,
        upsert: false,
      });

    if (uploadError) {
      console.error('Photo upload error:', uploadError);
      return res.status(500).json({
        success: false,
        error: 'Failed to upload photo',
      });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('attendance-photos')
      .getPublicUrl(fileName);

    // Determine final status
    let finalStatus = ATTENDANCE_STATUS.COMPLETED;
    if (attendance.status === ATTENDANCE_STATUS.LATE) {
      finalStatus = ATTENDANCE_STATUS.LATE; // Keep late status
    }
    if (isEarly) {
      finalStatus = ATTENDANCE_STATUS.EARLY_LEAVE;
    }

    // Update attendance record
    const { data: updatedAttendance, error: updateError } = await supabase
      .from('attendances')
      .update({
        check_out_time: now.toISOString(),
        check_out_photo_url: publicUrl,
        check_out_latitude: userLat,
        check_out_longitude: userLon,
        check_out_reason: isEarly ? reason : null,
        status: finalStatus,
      })
      .eq('id', attendance.id)
      .select()
      .single();

    if (updateError) {
      console.error('Update attendance error:', updateError);
      return res.status(500).json({
        success: false,
        error: 'Failed to update attendance record',
      });
    }

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
    // Support both offset-based and page-based pagination for compatibility
    const limit = Number(req.query.limit ?? 30);
    const page = req.query.page ? Number(req.query.page) : undefined;
    const rawOffset = req.query.offset ? Number(req.query.offset) : undefined;
    const offset = rawOffset ?? ((page && page > 0 ? (page - 1) * limit : 0));

    const month = req.query.month ? Number(req.query.month) : undefined; // 1-12
    const year = req.query.year ? Number(req.query.year) : undefined;
    const includePhotos = req.query.include_photos !== 'false';

    // Build base query
    let query = supabase
      .from('attendances')
      .select('*')
      .order('date', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    // Month/year filtering using GMT+8 (same timezone used to store `date`)
    if (month && year) {
      const start = moment.tz({ year, month: month - 1, day: 1 }, TIMEZONE)
        .startOf('month')
        .format('YYYY-MM-DD');
      const end = moment.tz({ year, month: month - 1, day: 1 }, TIMEZONE)
        .endOf('month')
        .format('YYYY-MM-DD');
      query = query.gte('date', start).lte('date', end);
    }

    // Apply pagination range
    query = query.range(offset, offset + limit - 1);

    const { data: attendances, error } = await query;

    if (error) {
      console.error('Fetch history error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch attendance history',
      });
    }

    // Optionally sign photo URLs (works even if bucket is private)
    async function signUrlIfPossible(publicUrl) {
      try {
        if (!publicUrl) return null;
        const marker = '/storage/v1/object/public/attendance-photos/';
        const idx = publicUrl.indexOf(marker);
        if (idx === -1) return publicUrl; // not a public URL we recognize
        const path = publicUrl.substring(idx + marker.length);
        const client = supabaseAdmin ?? supabase;
        const { data: signed, error: signErr } = await client
          .storage
          .from('attendance-photos')
          .createSignedUrl(path, 60 * 60 * 24); // 24h
        if (signErr || !signed) return publicUrl;
        return signed.signedUrl;
      } catch (_) {
        return publicUrl;
      }
    }

    const withSignedUrls = includePhotos
      ? await Promise.all((attendances || []).map(async (row) => {
          const isLateFlag = row.check_in_time ? isLateCheckIn(row.check_in_time) : false;
          const isEarlyFlag = row.check_out_time ? isEarlyCheckOut(row.check_out_time) : false;
          return {
            ...row,
            check_in_photo_url: await signUrlIfPossible(row.check_in_photo_url),
            check_out_photo_url: await signUrlIfPossible(row.check_out_photo_url),
            is_late_check_in: isLateFlag,
            is_early_check_out: isEarlyFlag,
          };
        }))
      : (attendances || []).map((row) => {
          const isLateFlag = row.check_in_time ? isLateCheckIn(row.check_in_time) : false;
          const isEarlyFlag = row.check_out_time ? isEarlyCheckOut(row.check_out_time) : false;
          return {
            ...row,
            check_in_photo_url: null,
            check_out_photo_url: null,
            is_late_check_in: isLateFlag,
            is_early_check_out: isEarlyFlag,
          };
        });

    // Fetch total count for hasMore calculation (same filters)
    let countQuery = supabase
      .from('attendances')
      .select('*', { count: 'exact', head: true });
    if (userId) {
      countQuery = countQuery.eq('user_id', userId);
    }
    if (month && year) {
      const start = moment.tz({ year, month: month - 1, day: 1 }, TIMEZONE)
        .startOf('month')
        .format('YYYY-MM-DD');
      const end = moment.tz({ year, month: month - 1, day: 1 }, TIMEZONE)
        .endOf('month')
        .format('YYYY-MM-DD');
      countQuery = countQuery.gte('date', start).lte('date', end);
    }
    const { count, error: countError } = await countQuery;
    if (countError) {
      console.warn('Count history warning:', countError);
    }

    const total = typeof count === 'number' ? count : undefined;
    const hasMore = total != null ? offset + withSignedUrls.length < total : withSignedUrls.length === limit;

    return res.status(200).json({
      success: true,
      data: withSignedUrls,
      meta: {
        page: page ?? (rawOffset != null ? Math.floor(rawOffset / limit) + 1 : 1),
        limit,
        offset,
        total,
        hasMore,
        month,
        year,
      },
    });
  } catch (error) {
    console.error('Get history error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
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

    const { data: attendance, error } = await supabase
      .from('attendances')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !attendance) {
      return res.status(404).json({
        success: false,
        error: 'Attendance record not found',
      });
    }

    // Check authorization
    if (!isAdmin && attendance.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    // Sign photo URLs for detail response as well (24h)
    async function signUrlIfPossible(publicUrl) {
      try {
        if (!publicUrl) return null;
        const marker = '/storage/v1/object/public/attendance-photos/';
        const idx = publicUrl.indexOf(marker);
        if (idx === -1) return publicUrl;
        const path = publicUrl.substring(idx + marker.length);
        const client = supabaseAdmin ?? supabase;
        const { data: signed, error: signErr } = await client
          .storage
          .from('attendance-photos')
          .createSignedUrl(path, 60 * 60 * 24);
        if (signErr || !signed) return publicUrl;
        return signed.signedUrl;
      } catch (_) {
        return publicUrl;
      }
    }

    const mapped = {
      ...attendance,
      check_in_photo_url: await signUrlIfPossible(attendance.check_in_photo_url),
      check_out_photo_url: await signUrlIfPossible(attendance.check_out_photo_url),
      is_late_check_in: attendance.check_in_time ? isLateCheckIn(attendance.check_in_time) : false,
      is_early_check_out: attendance.check_out_time ? isEarlyCheckOut(attendance.check_out_time) : false,
    };

    return res.status(200).json({
      success: true,
      data: mapped,
    });
  } catch (error) {
    console.error('Get detail error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

module.exports = {
  checkIn,
  checkOut,
  getHistory,
  getDetail,
};
