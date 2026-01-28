const jwt = require('jsonwebtoken');

// Default: 24 hours (can be overridden via ACCESS_TOKEN_EXPIRES_IN env, in seconds)
const ACCESS_EXPIRES_IN = Number(process.env.ACCESS_TOKEN_EXPIRES_IN || 60 * 60 * 24);
// Default refresh token: 14 days (can be overridden via REFRESH_TOKEN_EXPIRES_IN env, in seconds)
const REFRESH_EXPIRES_IN = Number(process.env.REFRESH_TOKEN_EXPIRES_IN || 60 * 60 * 24 * 14);

function signAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: ACCESS_EXPIRES_IN });
}

function signRefreshToken(payload) {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES_IN });
}

function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  ACCESS_EXPIRES_IN,
  REFRESH_EXPIRES_IN,
};
