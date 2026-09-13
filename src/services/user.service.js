const db = require('../config/db');
const logger = require('../utils/logger');

class UserService {
  /**
   * Find user by phone number.
   * @param {string} phone
   * @returns {object|null} User record or null
   */
  findByPhone(phone) {
    try {
      const stmt = db.prepare('SELECT * FROM users WHERE phone = ?');
      return stmt.get(phone) || null;
    } catch (error) {
      logger.error('USER_SERVICE', `Error finding user by phone ${phone}:`, error);
      return null;
    }
  }

  /**
   * Create a new user record.
   * @param {string} phone
   * @param {string} [communityId]
   * @param {string} [name]
   * @returns {object} Created user record
   */
  createUser(phone, communityId = null, name = null) {
    try {
      const stmt = db.prepare(`
        INSERT INTO users (phone, name, community_id, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `);
      stmt.run(phone, name, communityId);
      logger.info('USER_SERVICE', `Created new user for phone ${phone}`, { name, communityId });
      return this.findByPhone(phone);
    } catch (error) {
      logger.error('USER_SERVICE', `Error creating user for ${phone}:`, error);
      throw error;
    }
  }

  /**
   * Update an existing user's community_id and optionally name.
   * @param {string} phone
   * @param {string} communityId
   * @param {string} [name]
   * @returns {object} Updated user record
   */
  updateCommunity(phone, communityId, name = null) {
    try {
      if (name) {
        const stmt = db.prepare(`
          UPDATE users
          SET community_id = ?, name = ?, updated_at = CURRENT_TIMESTAMP
          WHERE phone = ?
        `);
        stmt.run(communityId, name, phone);
      } else {
        const stmt = db.prepare(`
          UPDATE users
          SET community_id = ?, updated_at = CURRENT_TIMESTAMP
          WHERE phone = ?
        `);
        stmt.run(communityId, phone);
      }
      logger.info('USER_SERVICE', `Updated community for phone ${phone}`, { communityId, name });
      return this.findByPhone(phone);
    } catch (error) {
      logger.error('USER_SERVICE', `Error updating community for ${phone}:`, error);
      throw error;
    }
  }

  /**
   * Update user's flat/door number.
   * @param {string} phone
   * @param {string} flatNumber
   * @returns {object} Updated user record
   */
  updateFlatNumber(phone, flatNumber) {
    try {
      const stmt = db.prepare(`
        UPDATE users
        SET flat_number = ?, updated_at = CURRENT_TIMESTAMP
        WHERE phone = ?
      `);
      stmt.run(flatNumber, phone);
      logger.info('USER_SERVICE', `Updated flat number for phone ${phone}: ${flatNumber}`);
      return this.findByPhone(phone);
    } catch (error) {
      logger.error('USER_SERVICE', `Error updating flat number for ${phone}:`, error);
      throw error;
    }
  }

  /**
   * Get a user's saved community_id.
   * @param {string} phone
   * @returns {string|null} community_id or null
   */
  getSavedCommunity(phone) {
    const user = this.findByPhone(phone);
    return user ? user.community_id : null;
  }

  /**
   * Save user's community selection and profile name.
   * @param {string} phone
   * @param {string} communityId
   * @param {string} [name]
   * @returns {object} User record
   */
  saveUserCommunity(phone, communityId, name = null) {
    const existing = this.findByPhone(phone);
    if (existing) {
      return this.updateCommunity(phone, communityId, name);
    } else {
      return this.createUser(phone, communityId, name);
    }
  }
}

module.exports = new UserService();
