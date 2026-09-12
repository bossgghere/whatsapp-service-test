const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhook.controller');

// GET /webhook - Meta Challenge Verification
router.get('/webhook', webhookController.verifyWebhook);

// POST /webhook - Meta Message & Event Handler
router.post('/webhook', webhookController.handleWebhook);

// GET /orders - View placed orders
router.get('/orders', webhookController.getOrders);

module.exports = router;
