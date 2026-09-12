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
   * @returns {object} Created user record
   */
  createUser(phone, communityId = null) {
    try {
      const stmt = db.prepare(`
        INSERT INTO users (phone, community_id, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `);
      stmt.run(phone, communityId);
      logger.info('USER_SERVICE', `Created new user for phone ${phone}`, { communityId });
      return this.findByPhone(phone);
    } catch (error) {
      logger.error('USER_SERVICE', `Error creating user for ${phone}:`, error);
      throw error;
    }
  }

  /**
   * Update an existing user's community_id.
   * @param {string} phone
   * @param {string} communityId
   * @returns {object} Updated user record
   */
  updateCommunity(phone, communityId) {
    try {
      const stmt = db.prepare(`
        UPDATE users
        SET community_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE phone = ?
      `);
      stmt.run(communityId, phone);
      logger.info('USER_SERVICE', `Updated community for phone ${phone}`, { communityId });
      return this.findByPhone(phone);
    } catch (error) {
      logger.error('USER_SERVICE', `Error updating community for ${phone}:`, error);
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
   * Save user's community selection (creates user if new, updates if existing).
   * @param {string} phone
   * @param {string} communityId
   * @returns {object} User record
   */
  saveUserCommunity(phone, communityId) {
    const existing = this.findByPhone(phone);
    if (existing) {
      return this.updateCommunity(phone, communityId);
    } else {
      return this.createUser(phone, communityId);
    }
  }
}

module.exports = new UserService();
