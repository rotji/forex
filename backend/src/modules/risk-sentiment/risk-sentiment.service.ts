import { getDb } from "../../config/database";

export type RiskRegime = "RISK_ON" | "NEUTRAL" | "RISK_OFF";
export type ThreeWayBias = "BULLISH" | "NEUTRAL" | "BEARISH";

export interface CreateRiskSentimentInput {
  regime: RiskRegime;
  vix_level?: number | null;
  dxy_bias: ThreeWayBias;
  yields_bias: ThreeWayBias;
  equities_tone: ThreeWayBias;
  commodities_tone: ThreeWayBias;
  notes?: string | null;
  source?: string | null;
  recorded_at: string;
}

export interface UpdateRiskSentimentInput {
  regime?: RiskRegime;
  vix_level?: number | null;
  dxy_bias?: ThreeWayBias;
  yields_bias?: ThreeWayBias;
  equities_tone?: ThreeWayBias;
  commodities_tone?: ThreeWayBias;
  notes?: string | null;
  source?: string | null;
  recorded_at?: string;
}

export function getLatestRiskSentiment(limit = 30) {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM risk_sentiment_snapshots
       ORDER BY recorded_at DESC
       LIMIT ?`
    )
    .all(limit);
}

export function createRiskSentiment(input: CreateRiskSentimentInput) {
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO risk_sentiment_snapshots (
        regime,
        vix_level,
        dxy_bias,
        yields_bias,
        equities_tone,
        commodities_tone,
        notes,
        source,
        recorded_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.regime,
      input.vix_level ?? null,
      input.dxy_bias,
      input.yields_bias,
      input.equities_tone,
      input.commodities_tone,
      input.notes ?? null,
      input.source ?? null,
      input.recorded_at,
    );

  return db.prepare(`SELECT * FROM risk_sentiment_snapshots WHERE id = ?`).get(result.lastInsertRowid);
}

export function updateRiskSentiment(id: number, input: UpdateRiskSentimentInput) {
  const db = getDb();
  const fields: string[] = [];
  const params: unknown[] = [];

  if (input.regime !== undefined) { fields.push("regime = ?"); params.push(input.regime); }
  if (input.vix_level !== undefined) { fields.push("vix_level = ?"); params.push(input.vix_level); }
  if (input.dxy_bias !== undefined) { fields.push("dxy_bias = ?"); params.push(input.dxy_bias); }
  if (input.yields_bias !== undefined) { fields.push("yields_bias = ?"); params.push(input.yields_bias); }
  if (input.equities_tone !== undefined) { fields.push("equities_tone = ?"); params.push(input.equities_tone); }
  if (input.commodities_tone !== undefined) { fields.push("commodities_tone = ?"); params.push(input.commodities_tone); }
  if (input.notes !== undefined) { fields.push("notes = ?"); params.push(input.notes); }
  if (input.source !== undefined) { fields.push("source = ?"); params.push(input.source); }
  if (input.recorded_at !== undefined) { fields.push("recorded_at = ?"); params.push(input.recorded_at); }

  if (fields.length === 0) return db.prepare(`SELECT * FROM risk_sentiment_snapshots WHERE id = ?`).get(id);

  params.push(id);
  db.prepare(`UPDATE risk_sentiment_snapshots SET ${fields.join(", ")} WHERE id = ?`).run(...params);
  return db.prepare(`SELECT * FROM risk_sentiment_snapshots WHERE id = ?`).get(id);
}

export function deleteRiskSentiment(id: number): boolean {
  const db = getDb();
  const result = db.prepare(`DELETE FROM risk_sentiment_snapshots WHERE id = ?`).run(id);
  return result.changes > 0;
}