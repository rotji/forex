import { getDb } from "../../config/database";

export type PositioningBias = "BULLISH" | "NEUTRAL" | "BEARISH";
export type PositioningConviction = "LOW" | "MEDIUM" | "HIGH";

export interface CreatePositioningInput {
  currency: string;
  bias: PositioningBias;
  conviction: PositioningConviction;
  net_position_ratio?: number | null;
  source?: string | null;
  notes?: string | null;
  recorded_at: string;
}

export interface UpdatePositioningInput {
  currency?: string;
  bias?: PositioningBias;
  conviction?: PositioningConviction;
  net_position_ratio?: number | null;
  source?: string | null;
  notes?: string | null;
  recorded_at?: string;
}

export function getLatestPositioning(limit = 50) {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM positioning_snapshots
       ORDER BY recorded_at DESC
       LIMIT ?`
    )
    .all(limit);
}

export function getPositioningByCurrency(currency: string, limit = 20) {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM positioning_snapshots
       WHERE currency = ?
       ORDER BY recorded_at DESC
       LIMIT ?`
    )
    .all(currency.toUpperCase(), limit);
}

export function createPositioning(input: CreatePositioningInput) {
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO positioning_snapshots (
        currency,
        bias,
        conviction,
        net_position_ratio,
        source,
        notes,
        recorded_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.currency.toUpperCase(),
      input.bias,
      input.conviction,
      input.net_position_ratio ?? null,
      input.source ?? null,
      input.notes ?? null,
      input.recorded_at,
    );

  return db.prepare(`SELECT * FROM positioning_snapshots WHERE id = ?`).get(result.lastInsertRowid);
}

export function updatePositioning(id: number, input: UpdatePositioningInput) {
  const db = getDb();
  const fields: string[] = [];
  const params: unknown[] = [];

  if (input.currency !== undefined) { fields.push("currency = ?"); params.push(input.currency.toUpperCase()); }
  if (input.bias !== undefined) { fields.push("bias = ?"); params.push(input.bias); }
  if (input.conviction !== undefined) { fields.push("conviction = ?"); params.push(input.conviction); }
  if (input.net_position_ratio !== undefined) { fields.push("net_position_ratio = ?"); params.push(input.net_position_ratio); }
  if (input.source !== undefined) { fields.push("source = ?"); params.push(input.source); }
  if (input.notes !== undefined) { fields.push("notes = ?"); params.push(input.notes); }
  if (input.recorded_at !== undefined) { fields.push("recorded_at = ?"); params.push(input.recorded_at); }

  if (fields.length === 0) return db.prepare(`SELECT * FROM positioning_snapshots WHERE id = ?`).get(id);

  params.push(id);
  db.prepare(`UPDATE positioning_snapshots SET ${fields.join(", ")} WHERE id = ?`).run(...params);
  return db.prepare(`SELECT * FROM positioning_snapshots WHERE id = ?`).get(id);
}

export function deletePositioning(id: number) {
  const db = getDb();
  const result = db.prepare(`DELETE FROM positioning_snapshots WHERE id = ?`).run(id);
  return result.changes > 0;
}