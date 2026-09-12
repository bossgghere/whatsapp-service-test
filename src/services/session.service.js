const logger = require('../utils/logger');

class SessionService {
  constructor() {
    // In-memory sessions indexed by phone number
    this.sessions = new Map();
    // In-memory array of placed orders
    this.orders = [];
  }

  getSession(phone) {
    if (!this.sessions.has(phone)) {
      this.sessions.set(phone, {
        state: 'IDLE',
        community: null,
        category: null,
        service: null,
        updatedAt: new Date()
      });
    }
    return this.sessions.get(phone);
  }

  updateSession(phone, updateData) {
    const session = this.getSession(phone);
    const updated = { ...session, ...updateData, updatedAt: new Date() };
    this.sessions.set(phone, updated);
    logger.info('SESSION', `Updated session for ${phone}:`, { state: updated.state });
    return updated;
  }

  resetSession(phone) {
    this.sessions.set(phone, {
      state: 'IDLE',
      community: null,
      category: null,
      service: null,
      updatedAt: new Date()
    });
    logger.info('SESSION', `Reset session for ${phone}`);
  }

  createOrder(phone, orderDetails) {
    const orderId = `WS-${Math.floor(100000 + Math.random() * 900000)}`;
    const order = {
      orderId,
      phone,
      community: orderDetails.community,
      service: orderDetails.service,
      status: 'CONFIRMED',
      createdAt: new Date()
    };
    this.orders.push(order);
    logger.info('SESSION', `New Order Created! ID: ${orderId}`, order);
    return order;
  }

  getOrders() {
    return this.orders;
  }
}

module.exports = new SessionService();
