const logger = {
  info: (tag, message, extra = '') => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [INFO] [${tag}] ${message}`, extra ? JSON.stringify(extra) : '');
  },
  warn: (tag, message, extra = '') => {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] [WARN] [${tag}] ${message}`, extra ? JSON.stringify(extra) : '');
  },
  error: (tag, message, extra = '') => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [ERROR] [${tag}] ${message}`, extra ? JSON.stringify(extra) : '');
  }
};

module.exports = logger;
