// /api/utils/hash.js

const bcrypt = require('bcryptjs');

const BCRYPT_SALT_ROUNDS = 10;

/**
 * Hash a plain text password
 * @param {string} plainPassword
 * @returns {Promise<string>} hashed password
 */
const hashPassword = async (plainPassword) => {
  if (!plainPassword) {
    throw new Error("Password is required for hashing");
  }
  return await bcrypt.hash(plainPassword, BCRYPT_SALT_ROUNDS);
};

/**
 * Compare plain password to hashed password
 * @param {string} plainPassword
 * @param {string} hashedPassword
 * @returns {Promise<boolean>} whether the passwords match
 */
const comparePassword = async (plainPassword, hashedPassword) => {
  if (!plainPassword || !hashedPassword) return false;
  return await bcrypt.compare(plainPassword, hashedPassword);
};

module.exports = {
  hashPassword,
  comparePassword
};
