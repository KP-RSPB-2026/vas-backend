const moment = require('moment-timezone');
const { WORK_HOURS } = require('../config/constants');

const TIMEZONE = 'Asia/Singapore';

function getCurrentTimeGMT8() {
  return moment().tz(TIMEZONE);
}

function isLateCheckIn(checkInTime) {
  const time = moment(checkInTime).tz(TIMEZONE);
  const hour = time.hours();
  const minute = time.minutes();
  if (hour > WORK_HOURS.START.HOUR) return true;
  if (hour === WORK_HOURS.START.HOUR && minute > WORK_HOURS.START.MINUTE) return true;
  return false;
}

function isEarlyCheckOut(checkOutTime) {
  const time = moment(checkOutTime).tz(TIMEZONE);
  const hour = time.hours();
  const minute = time.minutes();
  if (hour < WORK_HOURS.END.HOUR) return true;
  if (hour === WORK_HOURS.END.HOUR && minute < WORK_HOURS.END.MINUTE) return true;
  return false;
}

function getTodayDate() {
  return getCurrentTimeGMT8().format('YYYY-MM-DD');
}

function formatTime(date) {
  return moment(date).tz(TIMEZONE).format('HH:mm');
}

module.exports = { getCurrentTimeGMT8, isLateCheckIn, isEarlyCheckOut, getTodayDate, formatTime, TIMEZONE };