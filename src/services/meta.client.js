const axios = require('axios');
const env = require('../config/env');
const logger = require('../utils/logger');

class MetaClient {
  constructor() {
    this.accessToken = env.WHATSAPP_ACCESS_TOKEN;
    this.phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID;
    this.apiVersion = env.WHATSAPP_GRAPH_API_VERSION;
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;
  }

  /**
   * Private HTTP request wrapper for Meta Graph API calls.
   */
  async _send(data) {
    if (!this.accessToken || !this.phoneNumberId) {
      logger.warn('META_CLIENT', 'Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID. Skipping Graph API call.');
      logger.info('META_CLIENT', 'Mock Outgoing Payload:', data);
      return { success: false, reason: 'unconfigured_credentials', mock: true };
    }

    const url = `${this.baseUrl}/${this.phoneNumberId}/messages`;

    try {
      const response = await axios.post(url, data, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      logger.info('META_CLIENT', `Successfully sent Meta message to ${data.to}`);
      return response.data;
    } catch (error) {
      const errorData = error.response ? error.response.data : error.message;
      logger.error('META_CLIENT', 'Meta API Call Failed:', errorData);
      throw new Error(`Meta API Error: ${JSON.stringify(errorData)}`);
    }
  }

  /**
   * Send plain text message.
   */
  async sendText(to, text) {
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: {
        preview_url: false,
        body: text
      }
    };
    return await this._send(payload);
  }

  /**
   * Send Interactive Reply Buttons message (up to 3 buttons).
   * @param {string} to - Recipient phone
   * @param {string} bodyText - Main message body
   * @param {Array<{id: string, title: string}>} buttons - Array of button objects (max 3)
   * @param {string} [headerText] - Optional header text
   * @param {string} [footerText] - Optional footer text
   */
  async sendReplyButtons(to, bodyText, buttons, headerText = null, footerText = null) {
    const formattedButtons = buttons.slice(0, 3).map(btn => ({
      type: 'reply',
      reply: {
        id: btn.id,
        title: btn.title.substring(0, 20) // Meta max 20 chars limit for button titles
      }
    }));

    const interactive = {
      type: 'button',
      body: { text: bodyText },
      action: { buttons: formattedButtons }
    };

    if (headerText) {
      interactive.header = { type: 'text', text: headerText };
    }
    if (footerText) {
      interactive.footer = { text: footerText };
    }

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive
    };

    return await this._send(payload);
  }

  /**
   * Send Interactive List message.
   * @param {string} to - Recipient phone
   * @param {string} bodyText - Main message text
   * @param {string} buttonTitle - Action button label (e.g. "Select Option")
   * @param {Array<{title: string, rows: Array<{id: string, title: string, description?: string}>}>} sections
   * @param {string} [headerText]
   * @param {string} [footerText]
   */
  async sendInteractiveList(to, bodyText, buttonTitle, sections, headerText = null, footerText = null) {
    const interactive = {
      type: 'list',
      body: { text: bodyText },
      action: {
        button: buttonTitle.substring(0, 20),
        sections: sections.map(section => ({
          title: section.title.substring(0, 24),
          rows: section.rows.map(row => ({
            id: row.id,
            title: row.title.substring(0, 24),
            description: row.description ? row.description.substring(0, 72) : undefined
          }))
        }))
      }
    };

    if (headerText) {
      interactive.header = { type: 'text', text: headerText };
    }
    if (footerText) {
      interactive.footer = { text: footerText };
    }

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive
    };

    return await this._send(payload);
  }
}

module.exports = new MetaClient();
