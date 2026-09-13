const env = require('../config/env');
const logger = require('../utils/logger');
const stateMachineService = require('../services/state-machine.service');
const orderService = require('../services/order.service');

class WebhookController {
  /**
   * GET /webhook
   * Meta Webhook Verification Challenge handler.
   */
  verifyWebhook = (req, res) => {
    try {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];

      logger.info('WEBHOOK', `Received Verification Request. Mode: ${mode}, Token: ${token}`);

      if (mode && token) {
        if (mode === 'subscribe' && token === env.WHATSAPP_VERIFY_TOKEN) {
          logger.info('WEBHOOK', 'Webhook verification challenge PASSED.');
          return res.status(200).send(challenge);
        } else {
          logger.warn('WEBHOOK', 'Webhook verification challenge FAILED (Token Mismatch).');
          return res.status(403).json({ success: false, message: 'Token mismatch.' });
        }
      }

      return res.status(400).json({ success: false, message: 'Missing hub.mode or hub.verify_token.' });
    } catch (error) {
      logger.error('WEBHOOK', 'Error in verifyWebhook:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * POST /webhook
   * Incoming Meta Webhook Event Notification Endpoint.
   */
  handleWebhook = (req, res) => {
    try {
      const payload = req.body;
      logger.info('WEBHOOK', 'Received incoming Meta Webhook Event');

      // Process payload asynchronously in background
      stateMachineService.processIncomingPayload(payload).catch(err => {
        logger.error('WEBHOOK', 'Background processing error:', err);
      });

      // Acknowledge HTTP 200 OK immediately to Meta
      return res.status(200).json({ success: true });
    } catch (error) {
      logger.error('WEBHOOK', 'Error handling incoming webhook:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * GET /orders
   * View all placed orders saved in SQLite.
   */
  getOrders = (req, res) => {
    const orders = orderService.getAllOrders();
    return res.status(200).json({
      success: true,
      count: orders.length,
      orders: orders
    });
  };
}

module.exports = new WebhookController();
