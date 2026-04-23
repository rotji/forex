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

interface EconomicEventRow {
  title: string;
  currency: string;
  impact: Importance;
  actual_value: string | null;
  forecast_value: string | null;
  previous_value: string | null;
  scheduled_at: string;
}

type ThreeWayBias = "BULLISH" | "NEUTRAL" | "BEARISH";
type RiskRegime = "RISK_ON" | "NEUTRAL" | "RISK_OFF";

interface RiskSentimentRow {
  regime: RiskRegime;
  vix_level: number | null;
  dxy_bias: ThreeWayBias;
  yields_bias: ThreeWayBias;
  equities_tone: ThreeWayBias;
  commodities_tone: ThreeWayBias;
  recorded_at: string;
}

interface PositioningRow {
  currency: string;
  bias: BiasLabel;
  conviction: Importance;
  net_position_ratio: number | null;
  recorded_at: string;
}

export interface BiasBreakdown {
  macro: number;
  events: number;
  centralBank: number;
  riskSentiment: number;
  positioning: number;
}

interface BiasSnapshot {
  currency: string;
  score: number;
  bias: BiasLabel;
  confidence: number;
  drivers: string;
  breakdown: string;
  computedAt: string;
}

export interface RecomputeCurrencyBiasesResult {
  rows: BiasSnapshot[];
  macroIndicatorsCount: number;
  economicEventsCount: number;
  centralBankEventsCount: number;
  riskSentimentCount: number;
  positioningCount: number;
}

const IMPORTANCE_WEIGHTS: Record<Importance, number> = {
  LOW: 0.6,
  MEDIUM: 1,
  HIGH: 1.6,
};

const EVENT_IMPACT_WEIGHTS: Record<Importance, number> = {
  LOW: 0.5,
  MEDIUM: 0.9,
  HIGH: 1.3,
};

const RISK_ON_BENEFICIARIES = new Set(["AUD", "NZD", "CAD", "NOK", "SEK", "ZAR", "MXN", "BRL", "GBP", "EUR"]);
const RISK_OFF_BENEFICIARIES = new Set(["USD", "JPY", "CHF", "SGD", "HKD", "DKK"]);
const POSITIONING_WEIGHTS: Record<Importance, number> = {
  LOW: 0.05,
  MEDIUM: 0.1,
  HIGH: 0.16,
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

function parseNumeric(value: string | null): number | null {
  if (!value) return null;
  const normalized = value.replace(/,/g, "").trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function inferEventSignalDirection(title: string): SignalDirection {
  const t = title.toLowerCase();
  if (t.includes("unemployment") || t.includes("jobless")) {
    return "LOWER_IS_BULLISH";
  }
  return "HIGHER_IS_BULLISH";
}

function toEconomicEventContribution(event: EconomicEventRow): { contribution: number; label: string } | null {
  const actual = parseNumeric(event.actual_value);
  const forecast = parseNumeric(event.forecast_value);
  const previous = parseNumeric(event.previous_value);
  const baseSurprise = safeSurprise(actual, forecast) ?? safeSurprise(actual, previous);
  if (baseSurprise == null) return null;

  const direction = inferEventSignalDirection(event.title);
  const directional = direction === "LOWER_IS_BULLISH" ? baseSurprise * -1 : baseSurprise;
  const weight = EVENT_IMPACT_WEIGHTS[event.impact];
  const contribution = directional * weight;

  return {
    contribution,
    label: `${event.title} (${contribution > 0 ? "+" : ""}${contribution.toFixed(2)})`,
  };
}

function directionalBiasValue(value: ThreeWayBias): number {
  if (value === "BULLISH") return 1;
  if (value === "BEARISH") return -1;
  return 0;
}

function getRiskSentimentContribution(currency: string, riskSentiment: RiskSentimentRow | undefined) {
  if (!riskSentiment) return null;

  let contribution = 0;
  const labels: string[] = [];

  if (riskSentiment.regime === "RISK_ON") {
    if (RISK_ON_BENEFICIARIES.has(currency)) contribution += 0.14;
    if (RISK_OFF_BENEFICIARIES.has(currency)) contribution -= 0.08;
    labels.push("Risk regime: RISK_ON");
  } else if (riskSentiment.regime === "RISK_OFF") {
    if (RISK_OFF_BENEFICIARIES.has(currency)) contribution += 0.14;
    if (RISK_ON_BENEFICIARIES.has(currency)) contribution -= 0.08;
    labels.push("Risk regime: RISK_OFF");
  }

  if (currency === "USD") {
    contribution += directionalBiasValue(riskSentiment.dxy_bias) * 0.08;
    contribution += directionalBiasValue(riskSentiment.yields_bias) * 0.05;
    if (riskSentiment.dxy_bias !== "NEUTRAL") labels.push(`DXY: ${riskSentiment.dxy_bias}`);
    if (riskSentiment.yields_bias !== "NEUTRAL") labels.push(`US yields: ${riskSentiment.yields_bias}`);
  }

  if (["AUD", "NZD", "CAD", "NOK", "ZAR", "MXN", "BRL"].includes(currency)) {
    contribution += directionalBiasValue(riskSentiment.commodities_tone) * 0.05;
    if (riskSentiment.commodities_tone !== "NEUTRAL") labels.push(`Commodities: ${riskSentiment.commodities_tone}`);
  }

  if (["USD", "JPY", "CHF", "EUR", "GBP", "AUD", "NZD", "CAD"].includes(currency)) {
    contribution += directionalBiasValue(riskSentiment.equities_tone) * (RISK_ON_BENEFICIARIES.has(currency) ? 0.04 : -0.03);
    if (riskSentiment.equities_tone !== "NEUTRAL") labels.push(`Equities: ${riskSentiment.equities_tone}`);
  }

  if (contribution === 0 && labels.length === 0) return null;

  return {
    contribution: clamp(contribution, -0.3, 0.3),
    labels,
  };
}

function getPositioningContribution(positioning: PositioningRow | undefined) {
  if (!positioning) return null;

  const directional = positioning.bias === "BULLISH" ? 1 : positioning.bias === "BEARISH" ? -1 : 0;
  if (directional === 0) {
    return {
      contribution: 0,
      label: `Positioning: ${positioning.bias}`,
    };
  }

  const ratioFactor = positioning.net_position_ratio == null ? 1 : clamp(Math.abs(positioning.net_position_ratio), 0.4, 1.4);
  const contribution = clamp(directional * POSITIONING_WEIGHTS[positioning.conviction] * ratioFactor, -0.25, 0.25);

  return {
    contribution,
    label: `Positioning: ${positioning.bias} ${positioning.conviction}`,
  };
}

function computeCurrencySnapshot(
  currency: string,
  indicators: MacroIndicatorRow[],
  economicEvents: EconomicEventRow[],
  latestEvent: CentralBankEventRow | undefined,
  riskSentiment: RiskSentimentRow | undefined,
  positioning: PositioningRow | undefined,
  computedAt: string
): BiasSnapshot {
  const macroWeighted: Array<{ contribution: number; label: string }> = [];
  const eventWeighted: Array<{ contribution: number; label: string }> = [];

  for (const indicator of indicators) {
    const baseSurprise =
      safeSurprise(indicator.value, indicator.forecast_value) ??
      safeSurprise(indicator.value, indicator.previous_value);

    if (baseSurprise == null) continue;

    const directional =
      indicator.signal_direction === "LOWER_IS_BULLISH" ? baseSurprise * -1 : baseSurprise;
    const contribution = directional * IMPORTANCE_WEIGHTS[indicator.importance];
    macroWeighted.push({
      contribution,
      label: `${indicator.indicator_name} (${contribution > 0 ? "+" : ""}${contribution.toFixed(2)})`,
    });
  }

  for (const event of economicEvents) {
    const eventContribution = toEconomicEventContribution(event);
    if (!eventContribution) continue;
    eventWeighted.push(eventContribution);
  }

  const indicatorWeight = indicators.reduce((sum, item) => sum + IMPORTANCE_WEIGHTS[item.importance], 0);
  const eventWeight = economicEvents.reduce((sum, item) => sum + EVENT_IMPACT_WEIGHTS[item.impact], 0);
  const totalWeight = indicatorWeight + eventWeight;

  const macroRaw = macroWeighted.reduce((sum, x) => sum + x.contribution, 0);
  const eventsRaw = eventWeighted.reduce((sum, x) => sum + x.contribution, 0);
  const macroScore = totalWeight > 0 ? macroRaw / totalWeight : 0;
  const eventsScore = totalWeight > 0 ? eventsRaw / totalWeight : 0;
  const indicatorScore = macroScore + eventsScore;

  const toneAdjustment = getToneAdjustment(latestEvent?.outcome_tone ?? null);
  const riskAdjustment = getRiskSentimentContribution(currency, riskSentiment);
  const positioningAdjustment = getPositioningContribution(positioning);
  const score = clamp(
    indicatorScore + toneAdjustment + (riskAdjustment?.contribution ?? 0) + (positioningAdjustment?.contribution ?? 0),
    -1,
    1
  );
  const confidence = clamp(
    0.35 + Math.min(0.35, Math.abs(score) * 0.35) + Math.min(0.25, (indicators.length + economicEvents.length + (riskSentiment ? 1 : 0) + (positioning ? 1 : 0)) * 0.04),
    0.35,
    0.95
  );

  const allWeighted = [...macroWeighted, ...eventWeighted];
  const topDrivers = allWeighted
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .slice(0, 3)
    .map((x) => x.label);

  if (latestEvent?.outcome_tone) {
    topDrivers.push(`Central bank tone: ${latestEvent.outcome_tone}`);
  }
  if (riskAdjustment) {
    topDrivers.push(...riskAdjustment.labels.slice(0, 2));
  }
  if (positioningAdjustment) {
    topDrivers.push(positioningAdjustment.label);
  }

  const breakdown: BiasBreakdown = {
    macro: parseFloat(macroScore.toFixed(4)),
    events: parseFloat(eventsScore.toFixed(4)),
    centralBank: parseFloat(toneAdjustment.toFixed(4)),
    riskSentiment: parseFloat((riskAdjustment?.contribution ?? 0).toFixed(4)),
    positioning: parseFloat((positioningAdjustment?.contribution ?? 0).toFixed(4)),
  };

  return {
    currency,
    score,
    bias: toBiasLabel(score),
    confidence,
    drivers: topDrivers.length ? topDrivers.join("; ") : "Insufficient macro signals",
    breakdown: JSON.stringify(breakdown),
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

  const map: Record<string, Array<(typeof rows)[number]>> = {};
  for (const row of rows) {
    const bucket = map[row.currency] ?? (map[row.currency] = []);
    if (bucket.length >= limitPerCurrency) continue;
    bucket.push(row);
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

  const economicRows = db
    .prepare(
      `SELECT title, currency, impact, actual_value, forecast_value, previous_value, scheduled_at
       FROM economic_events
       WHERE actual_value IS NOT NULL
       ORDER BY scheduled_at DESC`
    )
    .all() as EconomicEventRow[];

  const riskSentiment = db
    .prepare(
      `SELECT regime, vix_level, dxy_bias, yields_bias, equities_tone, commodities_tone, recorded_at
       FROM risk_sentiment_snapshots
       ORDER BY recorded_at DESC
       LIMIT 1`
    )
    .get() as RiskSentimentRow | undefined;

  const positioningRows = db
    .prepare(
      `SELECT p.currency, p.bias, p.conviction, p.net_position_ratio, p.recorded_at
       FROM positioning_snapshots p
       INNER JOIN (
         SELECT currency, MAX(recorded_at) AS latest
         FROM positioning_snapshots
         GROUP BY currency
       ) latest_rows
       ON latest_rows.currency = p.currency AND latest_rows.latest = p.recorded_at`
    )
    .all() as PositioningRow[];
  const positioningMap = new Map(positioningRows.map((row) => [row.currency, row]));

  console.log(`[currency-bias] recomputing biases: ${indicatorRows.length} macro indicators, ${economicRows.length} economic events, ${bankRows.length} central bank events, ${riskSentiment ? 1 : 0} risk sentiment snapshots, ${positioningRows.length} positioning snapshots available`);

  const insertSnapshot = db.prepare(
    `INSERT INTO currency_bias_snapshots (currency, score, bias, confidence, drivers, breakdown, computed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  const snapshots: BiasSnapshot[] = [];

  const computeAndPersist = db.transaction(() => {
    for (const code of SUPPORTED_CURRENCIES) {
      const currency = code as string;
      const indicators = indicatorRows.filter((row) => row.currency === currency).slice(0, 8);
      const events = economicRows.filter((row) => row.currency === currency).slice(0, 6);
      const latestEvent = bankRows.find((row) => row.currency === currency);
      const positioning = positioningMap.get(currency);

      const snapshot = computeCurrencySnapshot(currency, indicators, events, latestEvent, riskSentiment, positioning, computedAt);
      insertSnapshot.run(
        snapshot.currency,
        snapshot.score,
        snapshot.bias,
        snapshot.confidence,
        snapshot.drivers,
        snapshot.breakdown,
        snapshot.computedAt
      );
      
      const indicatorNames = indicators.map((i) => i.indicator_name).join(", ") || "(none)";
      const eventCount = events.length;
      const eventTone = latestEvent?.outcome_tone ? ` + event:${latestEvent.outcome_tone}` : "";
      const riskLabel = riskSentiment ? ` | risk: ${riskSentiment.regime}` : "";
      const positioningLabel = positioning ? ` | positioning: ${positioning.bias}/${positioning.conviction}` : "";
      console.log(`  [${currency}] ${snapshot.bias} (score ${snapshot.score.toFixed(2)}, conf ${(snapshot.confidence * 100).toFixed(0)}%) | indicators: ${indicatorNames} | events: ${eventCount}${eventTone}${riskLabel}${positioningLabel}`);
      
      snapshots.push(snapshot);
    }
  });

  computeAndPersist();
  return {
    rows: snapshots.sort((a, b) => b.score - a.score),
    macroIndicatorsCount: indicatorRows.length,
    economicEventsCount: economicRows.length,
    centralBankEventsCount: bankRows.length,
    riskSentimentCount: riskSentiment ? 1 : 0,
    positioningCount: positioningRows.length,
  };
}
