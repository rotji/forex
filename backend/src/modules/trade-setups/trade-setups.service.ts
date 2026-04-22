import { getDb } from "../../config/database";

interface CreateTradeSetupInput {
  signalId?: number | null;
  pairSymbol: string;
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2?: number | null;
  takeProfit3?: number | null;
  riskRewardRatio?: number | null;
  lotSizeSuggestion?: number | null;
  notes?: string | null;
  status?: "PENDING" | "ACTIVE" | "HIT_TP" | "HIT_SL" | "CANCELLED";
}

export function getActiveTradeSetups() {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM trade_setups
       WHERE status IN ('PENDING', 'ACTIVE')
       ORDER BY created_at DESC`
    )
    .all();
}

export function getTradeSetupsByPair(pairSymbol: string) {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM trade_setups
       WHERE pair_symbol = ?
       ORDER BY created_at DESC`
    )
    .all(pairSymbol.toUpperCase());
}

export function createTradeSetup(input: CreateTradeSetupInput) {
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO trade_setups (
        signal_id,
        pair_symbol,
        entry_price,
        stop_loss,
        take_profit_1,
        take_profit_2,
        take_profit_3,
        risk_reward_ratio,
        lot_size_suggestion,
        notes,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.signalId ?? null,
      input.pairSymbol.toUpperCase(),
      input.entryPrice,
      input.stopLoss,
      input.takeProfit1,
      input.takeProfit2 ?? null,
      input.takeProfit3 ?? null,
      input.riskRewardRatio ?? null,
      input.lotSizeSuggestion ?? null,
      input.notes ?? null,
      input.status ?? "PENDING"
    );

  const id = Number(result.lastInsertRowid);
  return db.prepare("SELECT * FROM trade_setups WHERE id = ?").get(id);
}

interface UpdateTradeSetupInput {
  pairSymbol?: string;
  entryPrice?: number;
  stopLoss?: number;
  takeProfit1?: number;
  takeProfit2?: number | null;
  takeProfit3?: number | null;
  riskRewardRatio?: number | null;
  lotSizeSuggestion?: number | null;
  notes?: string | null;
  status?: "PENDING" | "ACTIVE" | "HIT_TP" | "HIT_SL" | "CANCELLED";
}

export function updateTradeSetup(id: number, input: UpdateTradeSetupInput) {
  const db = getDb();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (input.pairSymbol !== undefined) { fields.push("pair_symbol = ?"); values.push(input.pairSymbol.toUpperCase()); }
  if (input.entryPrice !== undefined) { fields.push("entry_price = ?"); values.push(input.entryPrice); }
  if (input.stopLoss !== undefined) { fields.push("stop_loss = ?"); values.push(input.stopLoss); }
  if (input.takeProfit1 !== undefined) { fields.push("take_profit_1 = ?"); values.push(input.takeProfit1); }
  if ("takeProfit2" in input) { fields.push("take_profit_2 = ?"); values.push(input.takeProfit2 ?? null); }
  if ("takeProfit3" in input) { fields.push("take_profit_3 = ?"); values.push(input.takeProfit3 ?? null); }
  if ("riskRewardRatio" in input) { fields.push("risk_reward_ratio = ?"); values.push(input.riskRewardRatio ?? null); }
  if ("lotSizeSuggestion" in input) { fields.push("lot_size_suggestion = ?"); values.push(input.lotSizeSuggestion ?? null); }
  if ("notes" in input) { fields.push("notes = ?"); values.push(input.notes ?? null); }
  if (input.status !== undefined) { fields.push("status = ?"); values.push(input.status); }

  if (fields.length === 0) return db.prepare("SELECT * FROM trade_setups WHERE id = ?").get(id);

  fields.push("updated_at = datetime('now')");
  values.push(id);
  db.prepare(`UPDATE trade_setups SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  return db.prepare("SELECT * FROM trade_setups WHERE id = ?").get(id);
}

export function deleteTradeSetup(id: number) {
  const db = getDb();
  const existing = db.prepare("SELECT id FROM trade_setups WHERE id = ?").get(id);
  if (!existing) return false;
  db.prepare("DELETE FROM trade_setups WHERE id = ?").run(id);
  return true;
}
