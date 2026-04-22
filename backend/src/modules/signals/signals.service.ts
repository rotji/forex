import { getDb } from "../../config/database";

interface CreateSignalInput {
  pairSymbol: string;
  signalType: "BUY" | "SELL" | "NEUTRAL";
  timeframe: string;
  strength?: number | null;
  reasoning?: string | null;
  expiresAt?: string | null;
}

export function getActiveSignals() {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM signals
       WHERE is_active = 1
       ORDER BY generated_at DESC`
    )
    .all();
}

export function getSignalsByPair(pairSymbol: string) {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM signals
       WHERE pair_symbol = ? AND is_active = 1
       ORDER BY generated_at DESC`
    )
    .all(pairSymbol.toUpperCase());
}

export function createSignal(input: CreateSignalInput) {
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO signals (
        pair_symbol,
        signal_type,
        timeframe,
        strength,
        reasoning,
        expires_at,
        is_active
      ) VALUES (?, ?, ?, ?, ?, ?, 1)`
    )
    .run(
      input.pairSymbol.toUpperCase(),
      input.signalType,
      input.timeframe,
      input.strength ?? null,
      input.reasoning ?? null,
      input.expiresAt ?? null
    );

  const id = Number(result.lastInsertRowid);
  return db.prepare("SELECT * FROM signals WHERE id = ?").get(id);
}

interface UpdateSignalInput {
  signalType?: "BUY" | "SELL" | "NEUTRAL";
  timeframe?: string;
  strength?: number | null;
  reasoning?: string | null;
  expiresAt?: string | null;
  isActive?: number;
}

export function updateSignal(id: number, input: UpdateSignalInput) {
  const db = getDb();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (input.signalType !== undefined) { fields.push("signal_type = ?"); values.push(input.signalType); }
  if (input.timeframe !== undefined) { fields.push("timeframe = ?"); values.push(input.timeframe); }
  if ("strength" in input) { fields.push("strength = ?"); values.push(input.strength ?? null); }
  if ("reasoning" in input) { fields.push("reasoning = ?"); values.push(input.reasoning ?? null); }
  if ("expiresAt" in input) { fields.push("expires_at = ?"); values.push(input.expiresAt ?? null); }
  if (input.isActive !== undefined) { fields.push("is_active = ?"); values.push(input.isActive); }

  if (fields.length === 0) return db.prepare("SELECT * FROM signals WHERE id = ?").get(id);

  values.push(id);
  db.prepare(`UPDATE signals SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  return db.prepare("SELECT * FROM signals WHERE id = ?").get(id);
}

export function deleteSignal(id: number) {
  const db = getDb();
  const existing = db.prepare("SELECT id FROM signals WHERE id = ?").get(id);
  if (!existing) return false;

  const removeSignal = db.transaction((signalId: number) => {
    db.prepare("UPDATE trade_setups SET signal_id = NULL WHERE signal_id = ?").run(signalId);
    db.prepare("DELETE FROM signals WHERE id = ?").run(signalId);
  });

  removeSignal(id);
  return true;
}
