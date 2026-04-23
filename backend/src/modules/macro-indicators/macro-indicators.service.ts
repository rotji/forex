import { getDb } from "../../config/database";

export function getLatestMacroIndicators(limit = 50) {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM macro_indicators
       ORDER BY released_at DESC
       LIMIT ?`
    )
    .all(limit);
}

export function getMacroIndicatorsByCurrency(currency: string, limit = 30) {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM macro_indicators
       WHERE currency = ?
       ORDER BY released_at DESC
       LIMIT ?`
    )
    .all(currency.toUpperCase(), limit);
}

export interface CreateMacroIndicatorInput {
  indicator_code: string;
  indicator_name: string;
  currency: string;
  value?: number | null;
  previous_value?: number | null;
  forecast_value?: number | null;
  unit?: string | null;
  importance: "LOW" | "MEDIUM" | "HIGH";
  signal_direction: "HIGHER_IS_BULLISH" | "LOWER_IS_BULLISH";
  period?: string | null;
  released_at: string;
  source?: string | null;
}

export function createMacroIndicator(input: CreateMacroIndicatorInput) {
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO macro_indicators
         (indicator_code, indicator_name, currency, value, previous_value, forecast_value,
          unit, importance, signal_direction, period, released_at, source,
          source_provider, source_id, ingested_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual', NULL, NULL)`
    )
    .run(
      input.indicator_code,
      input.indicator_name,
      input.currency.toUpperCase(),
      input.value ?? null,
      input.previous_value ?? null,
      input.forecast_value ?? null,
      input.unit ?? null,
      input.importance,
      input.signal_direction,
      input.period ?? null,
      input.released_at,
      input.source ?? null,
    );
  return db.prepare(`SELECT * FROM macro_indicators WHERE id = ?`).get(result.lastInsertRowid);
}

export interface UpdateMacroIndicatorInput {
  indicator_code?: string;
  indicator_name?: string;
  currency?: string;
  value?: number | null;
  previous_value?: number | null;
  forecast_value?: number | null;
  unit?: string | null;
  importance?: "LOW" | "MEDIUM" | "HIGH";
  signal_direction?: "HIGHER_IS_BULLISH" | "LOWER_IS_BULLISH";
  period?: string | null;
  released_at?: string;
  source?: string | null;
}

export function updateMacroIndicator(id: number, input: UpdateMacroIndicatorInput) {
  const db = getDb();
  const fields: string[] = [];
  const params: unknown[] = [];

  if (input.indicator_code !== undefined) { fields.push("indicator_code = ?"); params.push(input.indicator_code); }
  if (input.indicator_name !== undefined) { fields.push("indicator_name = ?"); params.push(input.indicator_name); }
  if (input.currency !== undefined) { fields.push("currency = ?"); params.push(input.currency.toUpperCase()); }
  if (input.value !== undefined) { fields.push("value = ?"); params.push(input.value); }
  if (input.previous_value !== undefined) { fields.push("previous_value = ?"); params.push(input.previous_value); }
  if (input.forecast_value !== undefined) { fields.push("forecast_value = ?"); params.push(input.forecast_value); }
  if (input.unit !== undefined) { fields.push("unit = ?"); params.push(input.unit); }
  if (input.importance !== undefined) { fields.push("importance = ?"); params.push(input.importance); }
  if (input.signal_direction !== undefined) { fields.push("signal_direction = ?"); params.push(input.signal_direction); }
  if (input.period !== undefined) { fields.push("period = ?"); params.push(input.period); }
  if (input.released_at !== undefined) { fields.push("released_at = ?"); params.push(input.released_at); }
  if (input.source !== undefined) { fields.push("source = ?"); params.push(input.source); }

  if (fields.length === 0) return db.prepare(`SELECT * FROM macro_indicators WHERE id = ?`).get(id);

  params.push(id);
  db.prepare(`UPDATE macro_indicators SET ${fields.join(", ")} WHERE id = ?`).run(...params);
  return db.prepare(`SELECT * FROM macro_indicators WHERE id = ?`).get(id);
}

export function deleteMacroIndicator(id: number): boolean {
  const db = getDb();
  const result = db.prepare(`DELETE FROM macro_indicators WHERE id = ?`).run(id);
  return result.changes > 0;
}
