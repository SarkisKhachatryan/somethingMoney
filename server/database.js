import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new sqlite3.Database(join(__dirname, 'database.db'));

// Promisify database methods
export function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

export function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

export function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Initialize database schema
export async function initDatabase() {
  // Users table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Families table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS families (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      currency TEXT DEFAULT 'USD' CHECK(currency IN ('USD', 'EUR', 'AMD', 'RUB')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Family members (join table)
  await dbRun(`
    CREATE TABLE IF NOT EXISTS family_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      family_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT DEFAULT 'member' CHECK(role IN ('owner', 'admin', 'member')),
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(family_id, user_id)
    )
  `);

  // Categories table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      family_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('expense', 'income')),
      color TEXT DEFAULT '#3B82F6',
      icon TEXT DEFAULT '💰',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
    )
  `);

  // Budgets table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      family_id INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      amount DECIMAL(10, 2) NOT NULL,
      month INTEGER NOT NULL CHECK(month >= 1 AND month <= 12),
      year INTEGER NOT NULL,
      currency TEXT DEFAULT 'USD',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
      UNIQUE(family_id, category_id, month, year)
    )
  `);

  // Transactions table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      family_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('expense', 'income')),
      amount DECIMAL(10, 2) NOT NULL,
      description TEXT,
      date DATE NOT NULL,
      currency TEXT DEFAULT 'USD',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    )
  `);

  // Goals table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      family_id INTEGER NOT NULL,
      user_id INTEGER,
      name TEXT NOT NULL,
      target_amount DECIMAL(10, 2) NOT NULL,
      current_amount DECIMAL(10, 2) DEFAULT 0,
      target_date DATE,
      description TEXT,
      currency TEXT DEFAULT 'USD',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  // Notifications table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      family_id INTEGER NOT NULL,
      user_id INTEGER,
      type TEXT NOT NULL CHECK(type IN ('bill_reminder', 'budget_alert', 'goal_milestone')),
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  // Recurring transactions table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS recurring_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      family_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('expense', 'income')),
      amount DECIMAL(10, 2) NOT NULL,
      description TEXT,
      frequency TEXT NOT NULL CHECK(frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
      start_date DATE NOT NULL,
      end_date DATE,
      next_occurrence DATE NOT NULL,
      day_of_month INTEGER,
      day_of_week INTEGER,
      is_active BOOLEAN DEFAULT 1,
      currency TEXT DEFAULT 'USD',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    )
  `);

  // Exchange rates table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS exchange_rates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      base_currency TEXT NOT NULL,
      target_currency TEXT NOT NULL,
      rate REAL NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(base_currency, target_currency)
    )
  `);

  console.log('Database initialized successfully');
}

// Export db if needed elsewhere
export { db };

