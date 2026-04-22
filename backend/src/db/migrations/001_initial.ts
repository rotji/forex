import { getDb } from "../../config/database";

export function runMigrations(): void {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS currencies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      symbol TEXT,
      country TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS currency_pairs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      base_currency TEXT NOT NULL,
      quote_currency TEXT NOT NULL,
      pair_symbol TEXT NOT NULL UNIQUE,
      pip_value REAL,
      is_major INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS economic_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      currency TEXT NOT NULL,
      impact TEXT NOT NULL CHECK(impact IN ('LOW','MEDIUM','HIGH')),
      scheduled_at TEXT NOT NULL,
      actual_value TEXT,
      forecast_value TEXT,
      previous_value TEXT,
      source TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS signals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pair_symbol TEXT NOT NULL,
      signal_type TEXT NOT NULL CHECK(signal_type IN ('BUY','SELL','NEUTRAL')),
      timeframe TEXT NOT NULL,
      strength REAL,
      reasoning TEXT,
      generated_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS trade_setups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      signal_id INTEGER REFERENCES signals(id),
      pair_symbol TEXT NOT NULL,
      entry_price REAL NOT NULL,
      stop_loss REAL NOT NULL,
      take_profit_1 REAL NOT NULL,
      take_profit_2 REAL,
      take_profit_3 REAL,
      risk_reward_ratio REAL,
      lot_size_suggestion REAL,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','ACTIVE','HIT_TP','HIT_SL','CANCELLED')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  console.log("Migrations ran successfully.");
}
