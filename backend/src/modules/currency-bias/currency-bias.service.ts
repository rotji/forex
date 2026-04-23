import { getDb } from "../../config/database";
import { SUPPORTED_CURRENCIES } from "../../config/constants";

type Importance = "LOW" | "MEDIUM" | "HIGH";
type SignalDirection = "HIGHER_IS_BULLISH" | "LOWER_IS_BULLISH";
type BiasLabel = "BULLISH" | "NEUTRAL" | "BEARISH";

interface MacroIndicatorRow {
  indicator_name: string;
  currency: string;
  value: number | null;
  previous_value: number | null;
  forecast_value: number | null;
  importance: Importance;
  signal_direction: SignalDirection;
  released_at: string;
}

interface CentralBankEventRow {
  currency: string;
  outcome_tone: "DOVISH" | "NEUTRAL" | "HAWKISH" | null;
  scheduled_at: string;
}

interface BiasSnapshot {
  currency: string;
  score: number;
  bias: BiasLabel;
  confidence: number;
  drivers: string;
  computedAt: string;
}

const IMPORTANCE_WEIGHTS: Record<Importance, number> = {
  LOW: 0.6,
  MEDIUM: 1,
  HIGH: 1.6,
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toBiasLabel(score: number): BiasLabel {
  if (score >= 0.15) return "BULLISH";
  if (score <= -0.15) return "BEARISH";
  return "NEUTRAL";
}

function safeSurprise(current: number | null, baseline: number | null): number | null {
  if (current == null || baseline == null) return null;
  const denom = Math.abs(baseline) || 1;
  return clamp((current - baseline) / denom, -1, 1);
}

function getToneAdjustment(tone: CentralBankEventRow["outcome_tone"]): number {
  if (tone === "HAWKISH") return 0.22;
  if (tone === "DOVISH") return -0.22;
  return 0;
}

function computeCurrencySnapshot(
  currency: string,
  indicators: MacroIndicatorRow[],
  latestEvent: CentralBankEventRow | undefined,
  computedAt: string
): BiasSnapshot {
  const weighted: Array<{ contribution: number; label: string }> = [];

  for (const indicator of indicators) {
    const baseSurprise =
      safeSurprise(indicator.value, indicator.forecast_value) ??
      safeSurprise(indicator.value, indicator.previous_value);

    if (baseSurprise == null) continue;

    const directional =
      indicator.signal_direction === "LOWER_IS_BULLISH" ? baseSurprise * -1 : baseSurprise;
    const weight = IMPORTANCE_WEIGHTS[indicator.importance];
    const contribution = directional * weight;

    weighted.push({
      contribution,
      label: `${indicator.indicator_name} (${contribution > 0 ? "+" : ""}${contribution.toFixed(2)})`,
    });
  }

  const totalWeight = indicators.reduce((sum, item) => sum + IMPORTANCE_WEIGHTS[item.importance], 0);
  const indicatorScoreRaw = weighted.reduce((sum, item) => sum + item.contribution, 0);
  const indicatorScore = totalWeight > 0 ? indicatorScoreRaw / totalWeight : 0;
  const toneAdjustment = getToneAdjustment(latestEvent?.outcome_tone ?? null);
  const score = clamp(indicatorScore + toneAdjustment, -1, 1);
  const confidence = clamp(
    0.35 + Math.min(0.35, Math.abs(score) * 0.35) + Math.min(0.25, indicators.length * 0.05),
    0.35,
    0.95
  );

  const topDrivers = weighted
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .slice(0, 3)
    .map((x) => x.label);

  if (latestEvent?.outcome_tone) {
    topDrivers.push(`Central bank tone: ${latestEvent.outcome_tone}`);
  }

  return {
    currency,
    score,
    bias: toBiasLabel(score),
    confidence,
    drivers: topDrivers.length ? topDrivers.join("; ") : "Insufficient macro signals",
    computedAt,
  };
}

export function getLatestCurrencyBiases() {
  const db = getDb();
  return db
    .prepare(
      `SELECT s.*
       FROM currency_bias_snapshots s
       INNER JOIN (
         SELECT currency, MAX(computed_at) AS latest
         FROM currency_bias_snapshots
         GROUP BY currency
       ) latest_rows
       ON latest_rows.currency = s.currency AND latest_rows.latest = s.computed_at
       ORDER BY s.score DESC`
    )
    .all();
}

export function getLatestCurrencyBiasByCode(currency: string) {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM currency_bias_snapshots
       WHERE currency = ?
       ORDER BY computed_at DESC
       LIMIT 1`
    )
    .get(currency.toUpperCase());
}

export function getCurrencyBiasHistoryByCode(currency: string, limit = 10) {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM currency_bias_snapshots
       WHERE currency = ?
       ORDER BY computed_at DESC
       LIMIT ?`
    )
    .all(currency.toUpperCase(), limit);
}

export function getCurrencyBiasHistoryMap(limitPerCurrency = 8) {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT * FROM currency_bias_snapshots
       ORDER BY computed_at DESC`
    )
    .all() as Array<{
      id: number;
      currency: string;
      score: number;
      bias: string;
      confidence: number;
      drivers: string | null;
      computed_at: string;
    }>;

  const map: Record<string, typeof rows> = {};
  for (const row of rows) {
    if (!map[row.currency]) map[row.currency] = [];
    if (map[row.currency].length >= limitPerCurrency) continue;
    map[row.currency].push(row);
  }
  return map;
}

export function recomputeCurrencyBiases() {
  const db = getDb();
  const computedAt = new Date().toISOString();

  const indicatorRows = db
    .prepare(
      `SELECT indicator_name, currency, value, previous_value, forecast_value, importance, signal_direction, released_at
       FROM macro_indicators
       ORDER BY released_at DESC`
    )
    .all() as MacroIndicatorRow[];

  const bankRows = db
    .prepare(
      `SELECT currency, outcome_tone, scheduled_at
       FROM central_bank_events
       ORDER BY scheduled_at DESC`
    )
    .all() as CentralBankEventRow[];

  const insertSnapshot = db.prepare(
    `INSERT INTO currency_bias_snapshots (currency, score, bias, confidence, drivers, computed_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  const snapshots: BiasSnapshot[] = [];

  const computeAndPersist = db.transaction(() => {
    for (const code of SUPPORTED_CURRENCIES) {
      const currency = code as string;
      const indicators = indicatorRows.filter((row) => row.currency === currency).slice(0, 8);
      const latestEvent = bankRows.find((row) => row.currency === currency);

      const snapshot = computeCurrencySnapshot(currency, indicators, latestEvent, computedAt);
      insertSnapshot.run(
        snapshot.currency,
        snapshot.score,
        snapshot.bias,
        snapshot.confidence,
        snapshot.drivers,
        snapshot.computedAt
      );
      snapshots.push(snapshot);
    }
  });

  computeAndPersist();
  return snapshots.sort((a, b) => b.score - a.score);
}
