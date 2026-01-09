const { WORK_HOURS } = require('../config/constants');

/**
 * Check if check-in time is late
 * @param {Date} checkInTime - Check-in timestamp
 * @returns {boolean} True if late
 */
function isLateCheckIn(checkInTime) {
  const time = new Date(checkInTime);
  const hour = time.getHours();
  const minute = time.getMinutes();
  
  if (hour > WORK_HOURS.START.HOUR) {
    return true;
  }
  
  if (hour === WORK_HOURS.START.HOUR && minute > WORK_HOURS.START.MINUTE) {
    return true;
  }
  
  return false;
}

/**
 * Check if check-out time is early
 * @param {Date} checkOutTime - Check-out timestamp
 * @returns {boolean} True if early
 */
function isEarlyCheckOut(checkOutTime) {
  const time = new Date(checkOutTime);
  const hour = time.getHours();
  const minute = time.getMinutes();
  
  if (hour < WORK_HOURS.END.HOUR) {
    return true;
  }
  
  if (hour === WORK_HOURS.END.HOUR && minute < WORK_HOURS.END.MINUTE) {
    return true;
  }
  
  return false;
}

/**
 * Get today's date in YYYY-MM-DD format (local timezone)
 * @returns {string} Date string
 */
function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format time to HH:MM format
 * @param {Date} date - Date object
 * @returns {string} Formatted time
 */
function formatTime(date) {
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${hour}:${minute}`;
}

module.exports = {
  isLateCheckIn,
  isEarlyCheckOut,
  getTodayDate,
  formatTime,
};
