const db = require('../config/db');
const logger = require('../utils/logger');

class OrderService {
  /**
   * Create a new order in SQLite database.
   * @param {string} phone
   * @param {object} session
   * @returns {object} Created order record
   */
  createOrder(phone, session) {
    try {
      const orderId = `SKP-${Math.floor(100000 + Math.random() * 900000)}`;
      const communityId = session.community ? session.community.id : '';
      const communityName = session.community ? session.community.title : '';
      const flatNumber = session.flatNumber || '';
      const serviceId = session.service ? session.service.id : '';
      const serviceName = session.service ? session.service.title : '';
      const price = session.service ? session.service.price : 0;

      const stmt = db.prepare(`
        INSERT INTO orders (order_id, phone, community_id, community_name, flat_number, service_id, service_name, price, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMED', CURRENT_TIMESTAMP)
      `);

      stmt.run(orderId, phone, communityId, communityName, flatNumber, serviceId, serviceName, price);

      const order = {
        orderId,
        phone,
        communityName,
        flatNumber,
        serviceName,
        price,
        status: 'CONFIRMED',
        createdAt: new Date().toISOString()
      };

      logger.info('ORDER_SERVICE', `🎉 NEW ORDER PLACED! ID: ${orderId}`, {
        phone,
        community: communityName,
        flat: flatNumber,
        service: serviceName,
        amount: `₹${price}`
      });

      return order;
    } catch (error) {
      logger.error('ORDER_SERVICE', `Failed to create order for ${phone}:`, error);
      throw error;
    }
  }

  /**
   * Fetch all placed orders from SQLite.
   * @returns {Array} List of orders
   */
  getAllOrders() {
    try {
      const stmt = db.prepare('SELECT * FROM orders ORDER BY created_at DESC');
      return stmt.all();
    } catch (error) {
      logger.error('ORDER_SERVICE', 'Error fetching orders from database:', error);
      return [];
    }
  }
}

module.exports = new OrderService();
