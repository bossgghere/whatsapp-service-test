const express = require('express');
const cors = require('cors');
const env = require('./src/config/env');
const logger = require('./src/utils/logger');
const db = require('./src/config/db');
const webhookRoutes = require('./src/routes/webhook.routes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root health check endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'WhatsApp Services API',
    status: 'online',
    version: '1.0.0',
    endpoints: {
      webhook_verification: 'GET /webhook',
      webhook_receiver: 'POST /webhook',
      placed_orders: 'GET /orders'
    }
  });
});

// Register Webhook Routes
app.use('/', webhookRoutes);

// Error Handling Middleware
app.use((err, req, res, next) => {
  logger.error('APP', 'Unhandled Express Error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Start Server
app.listen(env.PORT, () => {
  logger.info('APP', `🚀 WhatsApp Services Backend running on port ${env.PORT}`);
  logger.info('APP', `🔗 Local Webhook URL: http://localhost:${env.PORT}/webhook`);
  logger.info('APP', `🔑 Verify Token: "${env.WHATSAPP_VERIFY_TOKEN}"`);
});
