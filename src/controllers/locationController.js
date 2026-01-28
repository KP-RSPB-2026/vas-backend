const { isWithinRadius, calculateDistance } = require('../utils/location');
const pool = require('../config/db');

async function getActiveOfficeLocation() {
  const [rows] = await pool.execute('SELECT latitude, longitude, radius FROM office_location WHERE is_active = 1 LIMIT 1');
  return rows[0];
}

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

    const office = await getActiveOfficeLocation();
    if (!office) {
      return res.status(500).json({ success: false, error: 'Office location not configured' });
    }

    const distance = calculateDistance(
      userLat,
      userLon,
      parseFloat(office.latitude),
      parseFloat(office.longitude)
    );

    const isValid = isWithinRadius(
      userLat,
      userLon,
      parseFloat(office.latitude),
      parseFloat(office.longitude),
      parseInt(office.radius)
    );

    return res.status(200).json({
      success: true,
      data: {
        isValid,
        distance: Math.round(distance), // in meters
        allowedRadius: parseInt(office.radius),
        message: isValid 
          ? 'You are within the office area' 
          : `You are ${Math.round(distance - office.radius)}m outside the allowed area`,
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
