import { getDb } from "../../config/database";
import { MAJOR_PAIRS } from "../../config/constants";

interface LatestBiasRow {
  currency: string;
  score: number;
  confidence: number;
}

interface GeneratedAlert {
  pairSymbol: string;
  baseCurrency: string;
  quoteCurrency: string;
  direction: "BUY" | "SELL";
  confidence: number;
  baseScore: number;
  quoteScore: number;
  scoreDiff: number;
  rationale: string;
  expiresAt: string;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function getTradeAlerts(status: "ACTIVE" | "ACKNOWLEDGED" | "EXPIRED" | "ALL" = "ACTIVE", limit = 50) {
  const db = getDb();
  if (status === "ALL") {
    return db
      .prepare(
        `SELECT * FROM trade_alerts
         ORDER BY triggered_at DESC
         LIMIT ?`
      )
      .all(limit);
  }

  return db
    .prepare(
      `SELECT * FROM trade_alerts
       WHERE status = ?
       ORDER BY triggered_at DESC
       LIMIT ?`
    )
    .all(status, limit);
}

function buildAlertFromPair(pair: string, biasMap: Map<string, LatestBiasRow>): GeneratedAlert | null {
  const parts = pair.split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;

  const base = parts[0];
  const quote = parts[1];
  const baseBias = biasMap.get(base);
  const quoteBias = biasMap.get(quote);
  if (!baseBias || !quoteBias) return null;

  const diff = baseBias.score - quoteBias.score;
  if (Math.abs(diff) < 0.2) return null;

  const direction: "BUY" | "SELL" = diff > 0 ? "BUY" : "SELL";
  const confidence = clamp(
    0.45 + Math.abs(diff) * 0.35 + (baseBias.confidence + quoteBias.confidence) * 0.12,
    0.45,
    0.95
  );

  const rationale = `${base} score ${baseBias.score.toFixed(2)} vs ${quote} score ${quoteBias.score.toFixed(2)} (diff ${diff.toFixed(2)})`;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  return {
    pairSymbol: pair,
    baseCurrency: base,
    quoteCurrency: quote,
    direction,
    confidence,
    baseScore: baseBias.score,
    quoteScore: quoteBias.score,
    scoreDiff: diff,
    rationale,
    expiresAt,
  };
}

export function generateTradeAlertsFromBiases() {
  const db = getDb();

  const latestBiases = db
    .prepare(
      `SELECT s.currency, s.score, s.confidence
       FROM currency_bias_snapshots s
       INNER JOIN (
         SELECT currency, MAX(computed_at) AS latest
         FROM currency_bias_snapshots
         GROUP BY currency
       ) latest_rows
       ON latest_rows.currency = s.currency AND latest_rows.latest = s.computed_at`
    )
    .all() as LatestBiasRow[];

  const biasMap = new Map(latestBiases.map((row) => [row.currency, row]));
  const generated: GeneratedAlert[] = [];

  console.log(`[trade-alerts] generating alerts from ${latestBiases.length} latest currency biases`);

  const insertAlert = db.prepare(
    `INSERT INTO trade_alerts (
      pair_symbol,
      base_currency,
      quote_currency,
      direction,
      confidence,
      base_score,
      quote_score,
      score_diff,
      rationale,
      expires_at,
      status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`
  );

  const replaceAlerts = db.transaction(() => {
    db.prepare("UPDATE trade_alerts SET status = 'EXPIRED' WHERE status = 'ACTIVE'").run();

    for (const pair of MAJOR_PAIRS) {
      const alert = buildAlertFromPair(pair, biasMap);
      if (!alert) continue;
      insertAlert.run(
        alert.pairSymbol,
        alert.baseCurrency,
        alert.quoteCurrency,
        alert.direction,
        alert.confidence,
        alert.baseScore,
        alert.quoteScore,
        alert.scoreDiff,
        alert.rationale,
        alert.expiresAt
      );
      console.log(`  [${alert.pairSymbol}] ${alert.direction} (conf ${(alert.confidence * 100).toFixed(0)}%) diff=${alert.scoreDiff.toFixed(2)}`);
      generated.push(alert);
    }
  });

  replaceAlerts();
  return generated;
}

export function acknowledgeTradeAlert(id: number) {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM trade_alerts WHERE id = ?").get(id);
  if (!existing) return null;

  db.prepare("UPDATE trade_alerts SET status = 'ACKNOWLEDGED' WHERE id = ?").run(id);
  return db.prepare("SELECT * FROM trade_alerts WHERE id = ?").get(id);
}

export function acknowledgeTradeAlerts(ids: number[]) {
  const db = getDb();
  const uniqueIds = Array.from(new Set(ids.filter((id) => Number.isInteger(id) && id > 0)));
  if (uniqueIds.length === 0) return { updated: 0 };

  const placeholders = uniqueIds.map(() => "?").join(", ");
  const result = db
    .prepare(`UPDATE trade_alerts SET status = 'ACKNOWLEDGED' WHERE status = 'ACTIVE' AND id IN (${placeholders})`)
    .run(...uniqueIds);

  return { updated: result.changes };
}

export function expireStaleTradeAlerts() {
  const db = getDb();
  const result = db
    .prepare(
      `UPDATE trade_alerts
       SET status = 'EXPIRED'
       WHERE status = 'ACTIVE'
         AND expires_at IS NOT NULL
         AND datetime(expires_at) <= datetime('now')`
    )
    .run();

  return result.changes;
}

export function cleanupExpiredTradeAlerts(olderThanDays: number) {
  const db = getDb();
  const safeDays = Number.isFinite(olderThanDays) && olderThanDays > 0
    ? Math.min(365, Math.floor(olderThanDays))
    : 14;

  const result = db
    .prepare(
      `DELETE FROM trade_alerts
       WHERE status = 'EXPIRED'
         AND (
           (expires_at IS NOT NULL AND datetime(expires_at) <= datetime('now', '-' || ? || ' days'))
           OR (expires_at IS NULL AND datetime(triggered_at) <= datetime('now', '-' || ? || ' days'))
         )`
    )
    .run(safeDays, safeDays);

  return result.changes;
}
