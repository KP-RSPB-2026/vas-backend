// Working hours configuration
const WORK_HOURS = {
  START: {
    HOUR: parseInt(process.env.WORK_START_HOUR) || 7,
    MINUTE: parseInt(process.env.WORK_START_MINUTE) || 0,
  },
  END: {
    HOUR: parseInt(process.env.WORK_END_HOUR) || 16,
    MINUTE: parseInt(process.env.WORK_END_MINUTE) || 0,
  },
};

// Office location configuration
const OFFICE_LOCATION = {
  LATITUDE: parseFloat(process.env.OFFICE_LATITUDE) || -6.200000,
  LONGITUDE: parseFloat(process.env.OFFICE_LONGITUDE) || 106.816666,
  RADIUS: parseInt(process.env.OFFICE_RADIUS) || 50, // meters
};

// Attendance status enum
const ATTENDANCE_STATUS = {
  CHECKED_IN: 'checked_in',
  COMPLETED: 'completed',
  LATE: 'late',
  EARLY_LEAVE: 'early_leave',
};

// User roles
const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
};

module.exports = {
  WORK_HOURS,
  OFFICE_LOCATION,
  ATTENDANCE_STATUS,
  USER_ROLES,
};
