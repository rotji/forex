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

    CREATE TABLE IF NOT EXISTS macro_indicators (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      indicator_code TEXT NOT NULL,
      indicator_name TEXT NOT NULL,
      currency TEXT NOT NULL,
      value REAL,
      previous_value REAL,
      forecast_value REAL,
      unit TEXT,
      importance TEXT NOT NULL CHECK(importance IN ('LOW','MEDIUM','HIGH')),
      signal_direction TEXT NOT NULL CHECK(signal_direction IN ('HIGHER_IS_BULLISH','LOWER_IS_BULLISH')),
      period TEXT,
      released_at TEXT NOT NULL,
      source TEXT,
      source_provider TEXT,
      source_id TEXT,
      ingested_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS central_bank_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bank_code TEXT NOT NULL,
      bank_name TEXT NOT NULL,
      title TEXT NOT NULL,
      event_type TEXT NOT NULL CHECK(event_type IN ('RATE_DECISION','SPEECH','MINUTES','PRESS_CONFERENCE','INTERVENTION')),
      currency TEXT NOT NULL,
      scheduled_at TEXT NOT NULL,
      expected_value TEXT,
      actual_value TEXT,
      outcome_tone TEXT CHECK(outcome_tone IN ('DOVISH','NEUTRAL','HAWKISH')),
      source TEXT,
      source_provider TEXT,
      source_id TEXT,
      ingested_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS currency_bias_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      currency TEXT NOT NULL,
      score REAL NOT NULL,
      bias TEXT NOT NULL CHECK(bias IN ('BULLISH','NEUTRAL','BEARISH')),
      confidence REAL NOT NULL,
      drivers TEXT,
      computed_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS trade_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pair_symbol TEXT NOT NULL,
      base_currency TEXT,
      quote_currency TEXT,
      direction TEXT NOT NULL CHECK(direction IN ('BUY','SELL','NEUTRAL')),
      confidence REAL NOT NULL,
      base_score REAL,
      quote_score REAL,
      score_diff REAL,
      rationale TEXT,
      triggered_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','ACKNOWLEDGED','EXPIRED'))
    );

    CREATE TABLE IF NOT EXISTS ops_run_audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trigger_source TEXT NOT NULL,
      requested_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT,
      success INTEGER NOT NULL DEFAULT 0,
      message TEXT,
      expired_count INTEGER,
      cleaned_count INTEGER,
      bias_count INTEGER,
      generated_alerts_count INTEGER,
      duration_ms INTEGER,
      request_ip TEXT
    );

    CREATE TABLE IF NOT EXISTS ingestion_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider TEXT NOT NULL,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      success INTEGER NOT NULL DEFAULT 0,
      macro_inserted INTEGER NOT NULL DEFAULT 0,
      macro_updated INTEGER NOT NULL DEFAULT 0,
      macro_skipped INTEGER NOT NULL DEFAULT 0,
      cb_inserted INTEGER NOT NULL DEFAULT 0,
      cb_updated INTEGER NOT NULL DEFAULT 0,
      cb_skipped INTEGER NOT NULL DEFAULT 0,
      error_message TEXT,
      fetched_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_ops_run_audit_requested_at
      ON ops_run_audit(requested_at DESC);

    CREATE INDEX IF NOT EXISTS idx_ingestion_runs_started_at
      ON ingestion_runs(started_at DESC);
  `);

  const existingAlertColumns = db
    .prepare("PRAGMA table_info(trade_alerts)")
    .all() as Array<{ name: string }>;
  const columnSet = new Set(existingAlertColumns.map((c) => c.name));

  if (!columnSet.has("base_currency")) {
    db.exec("ALTER TABLE trade_alerts ADD COLUMN base_currency TEXT");
  }
  if (!columnSet.has("quote_currency")) {
    db.exec("ALTER TABLE trade_alerts ADD COLUMN quote_currency TEXT");
  }
  if (!columnSet.has("base_score")) {
    db.exec("ALTER TABLE trade_alerts ADD COLUMN base_score REAL");
  }
  if (!columnSet.has("quote_score")) {
    db.exec("ALTER TABLE trade_alerts ADD COLUMN quote_score REAL");
  }
  if (!columnSet.has("score_diff")) {
    db.exec("ALTER TABLE trade_alerts ADD COLUMN score_diff REAL");
  }

  const macroColumns = db
    .prepare("PRAGMA table_info(macro_indicators)")
    .all() as Array<{ name: string }>;
  const macroColumnSet = new Set(macroColumns.map((c) => c.name));

  if (!macroColumnSet.has("source_provider")) {
    db.exec("ALTER TABLE macro_indicators ADD COLUMN source_provider TEXT");
  }
  if (!macroColumnSet.has("source_id")) {
    db.exec("ALTER TABLE macro_indicators ADD COLUMN source_id TEXT");
  }
  if (!macroColumnSet.has("ingested_at")) {
    db.exec("ALTER TABLE macro_indicators ADD COLUMN ingested_at TEXT");
  }

  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_macro_source_unique
      ON macro_indicators(source_provider, source_id)
  `);

  const cbColumns = db
    .prepare("PRAGMA table_info(central_bank_events)")
    .all() as Array<{ name: string }>;
  const cbColumnSet = new Set(cbColumns.map((c) => c.name));

  if (!cbColumnSet.has("source_provider")) {
    db.exec("ALTER TABLE central_bank_events ADD COLUMN source_provider TEXT");
  }
  if (!cbColumnSet.has("source_id")) {
    db.exec("ALTER TABLE central_bank_events ADD COLUMN source_id TEXT");
  }
  if (!cbColumnSet.has("ingested_at")) {
    db.exec("ALTER TABLE central_bank_events ADD COLUMN ingested_at TEXT");
  }

  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_central_bank_source_unique
      ON central_bank_events(source_provider, source_id)
  `);

  console.log("Migrations ran successfully.");
}
