const Database = require('better-sqlite3');
const path = require('path');
const logger = require('../utils/logger');

const dbPath = path.join(__dirname, '../../prototype.db');
const db = new Database(dbPath);

// Enable Write-Ahead Logging (WAL) mode for better performance
db.pragma('journal_mode = WAL');

// Initialize database schema
const initDatabase = () => {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT UNIQUE NOT NULL,
        community_id TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT NOT NULL,
        community_id TEXT,
        service_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'CONFIRMED'
      );
    `);
    logger.info('DATABASE', `SQLite Database initialized successfully at ${dbPath}`);
  } catch (error) {
    logger.error('DATABASE', 'Failed to initialize SQLite Database:', error);
    throw error;
  }
};

initDatabase();

module.exports = db;
