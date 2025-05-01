const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-jwt-key';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'your-refresh-secret-key';

const ACCESS_TOKEN_EXPIRY = '1h';    // Adjust to your needs (e.g., 15m)
const REFRESH_TOKEN_EXPIRY = '7d';   // Adjust to your needs

/**
 * Generate a pair of access and refresh tokens
 * @param {Object} payload - User info for token
 * @returns {Object} - Tokens and metadata
 */
const generateTokenPair = (payload) => {
  const accessToken = jwt.sign(
    { ...payload, tokenType: 'access' },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );

  const refreshToken = jwt.sign(
    { ...payload, tokenType: 'refresh' },
    REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );

  const expiresInSeconds = 60 * 60; // 1 hour

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: 'Bearer',
    expires_in: expiresInSeconds
  };
};

/**
 * Verify access token
 * @param {string} token
 * @returns {Object|null}
 */
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
};

/**
 * Verify refresh token
 * @param {string} token
 * @returns {Object|null}
 */
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, REFRESH_SECRET);
  } catch (err) {
    return null;
  }
};

module.exports = {
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken
};
