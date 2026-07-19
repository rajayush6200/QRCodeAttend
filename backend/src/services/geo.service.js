/**
 * Geo Service — GPS verification using the Haversine formula.
 *
 * The Haversine formula calculates the great-circle distance between
 * two points on the Earth's surface given their lat/lng in degrees.
 */

const EARTH_RADIUS_METERS = 6371000; // mean Earth radius

/**
 * Convert degrees to radians.
 */
const toRad = (deg) => (deg * Math.PI) / 180;

/**
 * Calculate the distance in meters between two GPS coordinates
 * using the Haversine formula.
 *
 * @param {number} lat1 - Latitude of point 1 (degrees)
 * @param {number} lng1 - Longitude of point 1 (degrees)
 * @param {number} lat2 - Latitude of point 2 (degrees)
 * @param {number} lng2 - Longitude of point 2 (degrees)
 * @returns {number} Distance in meters
 */
const haversineDistance = (lat1, lng1, lat2, lng2) => {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
};

/**
 * Verify whether a student is within the session's geo-fence.
 *
 * @param {object} studentGeo - { lat, lng, accuracy? }
 * @param {object} sessionGeo - { lat, lng, radius }
 * @returns {{ isWithinRange: boolean, distance: number, allowedRadius: number, reason?: string }}
 */
const verifyGeoFence = (studentGeo, sessionGeo) => {
  if (
    !studentGeo ||
    typeof studentGeo.lat !== 'number' ||
    typeof studentGeo.lng !== 'number'
  ) {
    return {
      isWithinRange: false,
      distance: null,
      allowedRadius: sessionGeo.radius,
      reason: 'Student GPS coordinates are missing or invalid.',
    };
  }

  if (
    !sessionGeo ||
    typeof sessionGeo.lat !== 'number' ||
    typeof sessionGeo.lng !== 'number' ||
    typeof sessionGeo.radius !== 'number'
  ) {
    return {
      isWithinRange: false,
      distance: null,
      allowedRadius: null,
      reason: 'Session geo-fence is not configured correctly.',
    };
  }

  const distance = Math.round(
    haversineDistance(
      studentGeo.lat,
      studentGeo.lng,
      sessionGeo.lat,
      sessionGeo.lng
    )
  );

  // Expand effective radius by student GPS accuracy (up to 50m extra)
  const gpsAccuracy = Math.min(studentGeo.accuracy || 0, 50);
  const effectiveRadius = sessionGeo.radius + gpsAccuracy;

  const isWithinRange = distance <= effectiveRadius;

  return {
    isWithinRange,
    distance,
    allowedRadius: sessionGeo.radius,
    effectiveRadius,
    gpsAccuracy,
    reason: isWithinRange
      ? null
      : `You are ${distance}m away from the classroom. Maximum allowed distance is ${sessionGeo.radius}m.`,
  };
};

/**
 * Validate GPS coordinate format.
 */
const isValidCoordinate = (lat, lng) => {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
};

module.exports = { haversineDistance, verifyGeoFence, isValidCoordinate };
