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
        name TEXT,
        community_id TEXT,
        flat_number TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id TEXT UNIQUE NOT NULL,
        phone TEXT NOT NULL,
        community_id TEXT,
        community_name TEXT,
        flat_number TEXT,
        service_id TEXT,
        service_name TEXT,
        price INTEGER,
        status TEXT DEFAULT 'CONFIRMED',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Safely alter columns if updating existing prototype.db
    try { db.exec(`ALTER TABLE users ADD COLUMN name TEXT;`); } catch (e) {}
    try { db.exec(`ALTER TABLE users ADD COLUMN flat_number TEXT;`); } catch (e) {}
    try { db.exec(`ALTER TABLE orders ADD COLUMN order_id TEXT;`); } catch (e) {}
    try { db.exec(`ALTER TABLE orders ADD COLUMN community_name TEXT;`); } catch (e) {}
    try { db.exec(`ALTER TABLE orders ADD COLUMN flat_number TEXT;`); } catch (e) {}
    try { db.exec(`ALTER TABLE orders ADD COLUMN service_name TEXT;`); } catch (e) {}
    try { db.exec(`ALTER TABLE orders ADD COLUMN price INTEGER;`); } catch (e) {}

    logger.info('DATABASE', `SQLite Database initialized successfully at ${dbPath}`);
  } catch (error) {
    logger.error('DATABASE', 'Failed to initialize SQLite Database:', error);
    throw error;
  }
};

initDatabase();

module.exports = db;
