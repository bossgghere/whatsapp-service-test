const metaClient = require('./meta.client');
const sessionService = require('./session.service');
const userService = require('./user.service');
const orderService = require('./order.service');
const logger = require('../utils/logger');
const communitiesData = require('../data/communities.json');
const servicesData = require('../data/services.json');

class StateMachineService {
  /**
   * Main entry point for incoming Meta Webhook JSON payload.
   */
  async processIncomingPayload(payload) {
    const msg = this._normalizePayload(payload);
    if (!msg) {
      logger.info('STATE_MACHINE', 'No user message found in webhook payload.');
      return;
    }

    const { from, profileName, type, text, selectedId, selectedTitle } = msg;
    logger.info('STATE_MACHINE', `Processing message from ${from}`, { profileName, type, text, selectedId, selectedTitle });

    const session = sessionService.getSession(from);

    // Global reset trigger
    if (text && ['reset', 'restart', 'cancel', 'menu'].includes(text.toLowerCase().trim())) {
      sessionService.resetSession(from);
      await this._handleInitialGreeting(from, profileName);
      return;
    }

    // State Handler Switch
    switch (session.state) {
      case 'IDLE':
        await this._handleInitialGreeting(from, profileName);
        break;

      case 'CONFIRMING_SAVED_COMMUNITY':
        await this._handleSavedCommunityConfirmation(from, session, selectedId);
        break;

      case 'SELECTING_COMMUNITY':
        await this._handleCommunitySelection(from, session, selectedId, profileName);
        break;

      case 'ENTERING_FLAT_NUMBER':
        await this._handleFlatNumberEntry(from, session, text);
        break;

      case 'SELECTING_CATEGORY':
        await this._handleCategorySelection(from, session, selectedId);
        break;

      case 'SELECTING_SERVICE':
        await this._handleServiceSelection(from, session, selectedId);
        break;

      case 'CONFIRMING_ORDER':
        await this._handleOrderConfirmation(from, session, selectedId);
        break;

      default:
        sessionService.resetSession(from);
        await this._handleInitialGreeting(from, profileName);
        break;
    }
  }

  /**
   * Normalizes Meta Webhook event payload structure.
   */
  _normalizePayload(payload) {
    try {
      const entry = payload?.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;
      const message = value?.messages?.[0];

      if (!message) return null;

      const contact = value?.contacts?.[0];

      const normalized = {
        from: message.from,
        profileName: contact?.profile?.name || '',
        msgId: message.id,
        type: message.type,
        text: message.text?.body || '',
        selectedId: null,
        selectedTitle: null
      };

      if (message.type === 'interactive') {
        const interactive = message.interactive;
        if (interactive.type === 'list_reply') {
          normalized.selectedId = interactive.list_reply.id;
          normalized.selectedTitle = interactive.list_reply.title;
        } else if (interactive.type === 'button_reply') {
          normalized.selectedId = interactive.button_reply.id;
          normalized.selectedTitle = interactive.button_reply.title;
        }
      } else if (message.type === 'button') {
        const button = message.button;
        normalized.selectedId = button.payload || button.text;
        normalized.selectedTitle = button.text;
      } else if (message.type === 'text') {
        const body = (message.text?.body || '').trim().toLowerCase();
        if (body === 'yes, continue' || body === 'yes' || body === 'continue') {
          normalized.selectedId = 'btn_confirm_comm';
        } else if (body === 'change location' || body === 'change community' || body === 'change') {
          normalized.selectedId = 'btn_change_comm';
        } else if (body === 'confirm order' || body === 'confirm' || body === 'yes confirm') {
          normalized.selectedId = 'btn_confirm';
        } else if (body === 'cancel' || body === 'cancel order') {
          normalized.selectedId = 'btn_cancel';
        }
      }

      return normalized;
    } catch (err) {
      logger.error('STATE_MACHINE', 'Error normalizing payload', err);
      return null;
    }
  }

  /**
   * Handle Initial Greeting (Routes returning user vs new user)
   */
  async _handleInitialGreeting(from, profileName = '') {
    const user = userService.findByPhone(from);
    const savedCommunityId = user ? user.community_id : null;
    const savedCommunity = savedCommunityId ? communitiesData.find(c => c.id === savedCommunityId) : null;
    const flatNumber = user ? user.flat_number : null;

    if (savedCommunity && flatNumber) {
      sessionService.updateSession(from, {
        state: 'CONFIRMING_SAVED_COMMUNITY',
        community: savedCommunity,
        flatNumber: flatNumber
      });

      const buttons = [
        { id: 'btn_confirm_comm', title: 'Yes, continue' },
        { id: 'btn_change_comm', title: 'Change location' }
      ];

      const userName = (user && user.name) ? user.name : (profileName || 'there');
      const bodyText = `Welcome back, *${userName}*! 👋\n\n📍 Saved Location:\n*${savedCommunity.title}*\n🏠 Flat: *${flatNumber}*\n\nContinue with this address?`;
      await metaClient.sendReplyButtons(from, bodyText, buttons, '🏠 Skippr Services');
    } else if (savedCommunity) {
      // Community is saved, but flat number is missing
      sessionService.updateSession(from, {
        state: 'ENTERING_FLAT_NUMBER',
        community: savedCommunity
      });
      const userName = (user && user.name) ? user.name : (profileName || 'there');
      await metaClient.sendText(from, `Welcome back, *${userName}*! 👋\n\n📍 Community: *${savedCommunity.title}*\n\nPlease reply with your *Flat / Door Number* (e.g. A-402 or Villa 12):`);
    } else {
      // New user
      await this._sendCommunitySelection(from);
    }
  }

  /**
   * Handle Returning User Location Confirmation (Yes, continue / Change location)
   */
  async _handleSavedCommunityConfirmation(to, session, selectedId) {
    if (selectedId === 'btn_confirm_comm') {
      sessionService.updateSession(to, {
        state: 'SELECTING_CATEGORY'
      });

      const buttons = servicesData.categories.map(cat => ({
        id: cat.id,
        title: cat.title
      }));

      const bodyText = `📍 Location: *${session.community.title}* (Flat *${session.flatNumber}*)\n\nWhat type of service do you need today?`;
      await metaClient.sendReplyButtons(to, bodyText, buttons, '🛠️ Service Categories');
    } else if (selectedId === 'btn_change_comm') {
      await this._sendCommunitySelection(to);
    } else {
      // Re-send confirmation options if input is unrecognized text
      const user = userService.findByPhone(to);
      const userName = (user && user.name) ? user.name : 'there';
      const buttons = [
        { id: 'btn_confirm_comm', title: 'Yes, continue' },
        { id: 'btn_change_comm', title: 'Change location' }
      ];
      const bodyText = `Welcome back, *${userName}*! 👋\n\n📍 Saved Location:\n*${session.community.title}*\n🏠 Flat: *${session.flatNumber}*\n\nContinue with this address?`;
      await metaClient.sendReplyButtons(to, bodyText, buttons, '🏠 Skippr Services');
    }
  }

  /**
   * Send Interactive List of Communities
   */
  async _sendCommunitySelection(to) {
    sessionService.updateSession(to, { state: 'SELECTING_COMMUNITY' });

    const rows = communitiesData.map(c => ({
      id: c.id,
      title: c.title,
      description: c.description
    }));

    const sections = [
      {
        title: 'Select Community',
        rows
      }
    ];

    const bodyText = 'Welcome to Skippr Services! 👋\n\nPlease select your gated community to browse available services:';
    await metaClient.sendInteractiveList(to, bodyText, 'View Communities', sections, '🏘️ Skippr Services');
  }

  /**
   * Handle Community List Selection
   */
  async _handleCommunitySelection(to, session, selectedId, profileName = '') {
    const community = communitiesData.find(c => c.id === selectedId);

    if (!community) {
      await metaClient.sendText(to, 'Please select a valid community from the options provided below:');
      await this._sendCommunitySelection(to);
      return;
    }

    // Save selected community and profile name to SQLite
    const user = userService.saveUserCommunity(to, community.id, profileName);

    sessionService.updateSession(to, {
      community,
      state: 'ENTERING_FLAT_NUMBER'
    });

    const userName = (user && user.name) ? user.name : (profileName || '');
    const nameGreeting = userName ? `Thanks *${userName}*! ` : 'Thanks! ';
    const promptText = `${nameGreeting}📍 Community: *${community.title}*\n\nPlease reply with your *Flat / Door Number* (e.g. A-402 or Villa 12):`;
    await metaClient.sendText(to, promptText);
  }

  /**
   * Handle Flat / Door Number Entry
   */
  async _handleFlatNumberEntry(to, session, text) {
    const flatNumber = text ? text.trim() : '';

    if (!flatNumber) {
      await metaClient.sendText(to, 'Please reply with your Flat / Door Number (e.g. A-402 or Villa 12):');
      return;
    }

    // Save flat number in SQLite
    userService.updateFlatNumber(to, flatNumber);

    sessionService.updateSession(to, {
      flatNumber,
      state: 'SELECTING_CATEGORY'
    });

    const buttons = servicesData.categories.map(cat => ({
      id: cat.id,
      title: cat.title
    }));

    const bodyText = `✅ Address saved: *${session.community.title}* (Flat *${flatNumber}*)\n\nWhat type of service do you need today?`;
    await metaClient.sendReplyButtons(to, bodyText, buttons, '🛠️ Service Categories');
  }

  /**
   * Handle Category Reply Button Selection
   */
  async _handleCategorySelection(to, session, selectedId) {
    const category = servicesData.categories.find(c => c.id === selectedId);

    if (!category) {
      await metaClient.sendText(to, 'Please select one of the service category buttons below:');
      const buttons = servicesData.categories.map(cat => ({
        id: cat.id,
        title: cat.title
      }));
      await metaClient.sendReplyButtons(to, `📍 Community: *${session.community.title}*\n\nPlease tap a category:`, buttons);
      return;
    }

    sessionService.updateSession(to, {
      category,
      state: 'SELECTING_SERVICE'
    });

    const availableServices = servicesData.items[category.id] || [];

    const rows = availableServices.map(s => ({
      id: s.id,
      title: s.title,
      description: `₹${s.price} • ${s.description}`
    }));

    const sections = [
      {
        title: category.title,
        rows
      }
    ];

    const bodyText = `Category: *${category.title}*\n\nChoose the specific service you want to request:`;
    await metaClient.sendInteractiveList(to, bodyText, 'Select Service', sections, '📋 Service Catalog');
  }

  /**
   * Handle Service List Selection
   */
  async _handleServiceSelection(to, session, selectedId) {
    const serviceList = servicesData.items[session.category.id] || [];
    const service = serviceList.find(s => s.id === selectedId);

    if (!service) {
      await metaClient.sendText(to, 'Please select a service from the list.');
      return;
    }

    sessionService.updateSession(to, {
      service,
      state: 'CONFIRMING_ORDER'
    });

    const user = userService.findByPhone(to);
    const userName = (user && user.name) ? user.name : 'Resident';

    const summaryText = `📝 *Order Confirmation Summary*\n\n` +
      `👤 *Customer:* ${userName}\n` +
      `🏘️ *Community:* ${session.community.title}\n` +
      `🏠 *Flat:* ${session.flatNumber || 'N/A'}\n` +
      `🛠️ *Category:* ${session.category.title}\n` +
      `📦 *Service:* ${service.title}\n` +
      `💵 *Price:* ₹${service.price}\n\n` +
      `Would you like to place this service order now?`;

    const buttons = [
      { id: 'btn_confirm', title: '✅ Confirm Order' },
      { id: 'btn_cancel', title: '❌ Cancel' }
    ];

    await metaClient.sendReplyButtons(to, summaryText, buttons, '⚡ Confirm Booking');
  }

  /**
   * Handle Final Order Confirmation (Confirm / Cancel)
   */
  async _handleOrderConfirmation(to, session, selectedId) {
    if (selectedId === 'btn_confirm') {
      const order = orderService.createOrder(to, session);

      const receipt = `🎉 *Order Successfully Placed!*\n\n` +
        `🆔 *Order ID:* ${order.orderId}\n` +
        `🏘️ *Location:* ${session.community.title} (Flat ${session.flatNumber || 'N/A'})\n` +
        `📦 *Service:* ${session.service.title}\n` +
        `💵 *Amount Payable:* ₹${session.service.price}\n` +
        `⏳ *Status:* Confirmed (Professional assigned)\n\n` +
        `Thank you for using Skippr! Type *start* anytime to place another request.`;

      await metaClient.sendText(to, receipt);
      sessionService.resetSession(to);
    } else {
      await metaClient.sendText(to, '❌ Order cancelled. Type *start* or any message to begin again.');
      sessionService.resetSession(to);
    }
  }
}

module.exports = new StateMachineService();
