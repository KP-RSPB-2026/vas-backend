const { OFFICE_LOCATION } = require('../config/constants');
const { isWithinRadius, calculateDistance } = require('../utils/location');

/**
 * Validate if user is within office location
 */
const validateLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.query;

    // Validate input
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required',
      });
    }

    const userLat = parseFloat(latitude);
    const userLon = parseFloat(longitude);

    // Validate coordinates
    if (isNaN(userLat) || isNaN(userLon)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid coordinates',
      });
    }

    if (userLat < -90 || userLat > 90 || userLon < -180 || userLon > 180) {
      return res.status(400).json({
        success: false,
        error: 'Coordinates out of range',
      });
    }

    // Check if within radius
    const distance = calculateDistance(
      userLat,
      userLon,
      OFFICE_LOCATION.LATITUDE,
      OFFICE_LOCATION.LONGITUDE
    );

    const isValid = isWithinRadius(
      userLat,
      userLon,
      OFFICE_LOCATION.LATITUDE,
      OFFICE_LOCATION.LONGITUDE,
      OFFICE_LOCATION.RADIUS
    );

    return res.status(200).json({
      success: true,
      data: {
        isValid,
        distance: Math.round(distance), // in meters
        allowedRadius: OFFICE_LOCATION.RADIUS,
        message: isValid 
          ? 'You are within the office area' 
          : `You are ${Math.round(distance - OFFICE_LOCATION.RADIUS)}m outside the allowed area`,
      },
    });
  } catch (error) {
    console.error('Location validation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

module.exports = {
  validateLocation,
};
