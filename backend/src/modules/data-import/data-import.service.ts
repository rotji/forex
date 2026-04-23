import { parse } from "csv-parse/sync";
import { ValidationError } from "../../shared/errors/AppError";
import { isValidCurrencyCode, isValidISODate } from "../../ingestion/validation";
import { createMacroIndicator } from "../macro-indicators/macro-indicators.service";
import { createEconomicEvent } from "../economic-events/economic-events.service";
import { createCentralBankEvent } from "../central-bank-events/central-bank-events.service";
import { createRiskSentiment } from "../risk-sentiment/risk-sentiment.service";
import { createPositioning } from "../positioning/positioning.service";

export type CsvImportDataset =
  | "macro-indicators"
  | "economic-events"
  | "central-bank-events"
  | "risk-sentiment"
  | "positioning";

export interface CsvImportErrorRow {
  row: number;
  message: string;
}

export interface CsvImportResult {
  dataset: CsvImportDataset;
  totalRows: number;
  inserted: number;
  failed: number;
  errors: CsvImportErrorRow[];
}

type CsvRecord = Record<string, string>;

function normalizeKey(key: string): string {
  return key.trim().toLowerCase().replace(/[\s\-]+/g, "_");
}

function normalizeRecord(record: CsvRecord): CsvRecord {
  const out: CsvRecord = {};
  for (const [k, v] of Object.entries(record)) {
    out[normalizeKey(k)] = typeof v === "string" ? v.trim() : String(v ?? "");
  }
  return out;
}

function getValue(record: CsvRecord, aliases: string[]): string | undefined {
  for (const alias of aliases) {
    const key = normalizeKey(alias);
    if (record[key] !== undefined) return record[key];
  }
  return undefined;
}

function requiredString(record: CsvRecord, aliases: string[], fieldName: string): string {
  const value = getValue(record, aliases);
  if (!value) throw new ValidationError(`${fieldName} is required`);
  return value;
}

function optionalString(record: CsvRecord, aliases: string[]): string | null {
  const value = getValue(record, aliases);
  if (value === undefined || value === "") return null;
  return value;
}

function optionalNumber(record: CsvRecord, aliases: string[]): number | null {
  const value = getValue(record, aliases);
  if (value === undefined || value === "") return null;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) throw new ValidationError(`${aliases[0]} must be a number`);
  return parsed;
}

function normalizedEnum(value: string): string {
  return value.trim().toUpperCase().replace(/[\s\-]+/g, "_");
}

function validateCurrency(value: string): string {
  const upper = value.toUpperCase();
  if (!isValidCurrencyCode(upper)) throw new ValidationError("currency must be a 3-letter code");
  return upper;
}

function validateIsoDate(value: string, fieldName: string): string {
  if (!isValidISODate(value)) throw new ValidationError(`${fieldName} must be a valid ISO date string`);
  return new Date(value).toISOString();
}

function importMacroIndicator(record: CsvRecord): void {
  const importance = normalizedEnum(requiredString(record, ["importance", "impact"], "importance"));
  if (importance !== "LOW" && importance !== "MEDIUM" && importance !== "HIGH") {
    throw new ValidationError("importance must be LOW, MEDIUM, or HIGH");
  }

  const signalDirection = normalizedEnum(
    requiredString(record, ["signal_direction", "signal direction", "direction"], "signal_direction")
  );
  if (signalDirection !== "HIGHER_IS_BULLISH" && signalDirection !== "LOWER_IS_BULLISH") {
    throw new ValidationError("signal_direction must be HIGHER_IS_BULLISH or LOWER_IS_BULLISH");
  }

  createMacroIndicator({
    indicator_code: requiredString(record, ["indicator_code", "code"], "indicator_code").toUpperCase(),
    indicator_name: requiredString(record, ["indicator_name", "name", "indicator"], "indicator_name"),
    currency: validateCurrency(requiredString(record, ["currency"], "currency")),
    value: optionalNumber(record, ["value", "actual_value", "actual"]),
    previous_value: optionalNumber(record, ["previous_value", "previous"]),
    forecast_value: optionalNumber(record, ["forecast_value", "forecast", "expected_value", "expected"]),
    unit: optionalString(record, ["unit"]),
    importance: importance as "LOW" | "MEDIUM" | "HIGH",
    signal_direction: signalDirection as "HIGHER_IS_BULLISH" | "LOWER_IS_BULLISH",
    period: optionalString(record, ["period"]),
    released_at: validateIsoDate(requiredString(record, ["released_at", "released"], "released_at"), "released_at"),
    source: optionalString(record, ["source"]),
  });
}

function importEconomicEvent(record: CsvRecord): void {
  const impact = normalizedEnum(requiredString(record, ["impact", "importance"], "impact"));
  if (impact !== "LOW" && impact !== "MEDIUM" && impact !== "HIGH") {
    throw new ValidationError("impact must be LOW, MEDIUM, or HIGH");
  }

  createEconomicEvent({
    title: requiredString(record, ["title", "event", "event_title"], "title"),
    currency: validateCurrency(requiredString(record, ["currency"], "currency")),
    impact: impact as "LOW" | "MEDIUM" | "HIGH",
    scheduledAt: validateIsoDate(
      requiredString(record, ["scheduled_at", "scheduled", "scheduledat"], "scheduled_at"),
      "scheduled_at"
    ),
    actualValue: optionalString(record, ["actual_value", "actual"]),
    forecastValue: optionalString(record, ["forecast_value", "forecast", "expected_value", "expected"]),
    previousValue: optionalString(record, ["previous_value", "previous"]),
    source: optionalString(record, ["source"]),
  });
}

function importCentralBankEvent(record: CsvRecord): void {
  const eventType = normalizedEnum(requiredString(record, ["event_type", "type"], "event_type"));
  const validEventTypes = ["RATE_DECISION", "SPEECH", "MINUTES", "PRESS_CONFERENCE", "INTERVENTION"];
  if (!validEventTypes.includes(eventType)) {
    throw new ValidationError(`event_type must be one of: ${validEventTypes.join(", ")}`);
  }

  const toneRaw = optionalString(record, ["outcome_tone", "tone"]);
  const tone = toneRaw ? normalizedEnum(toneRaw) : null;
  if (tone !== null && tone !== "DOVISH" && tone !== "NEUTRAL" && tone !== "HAWKISH") {
    throw new ValidationError("outcome_tone must be DOVISH, NEUTRAL, or HAWKISH");
  }

  createCentralBankEvent({
    bank_code: requiredString(record, ["bank_code", "code"], "bank_code").toUpperCase(),
    bank_name: requiredString(record, ["bank_name", "bank"], "bank_name"),
    title: requiredString(record, ["title", "event", "event_title"], "title"),
    event_type: eventType as "RATE_DECISION" | "SPEECH" | "MINUTES" | "PRESS_CONFERENCE" | "INTERVENTION",
    currency: validateCurrency(requiredString(record, ["currency"], "currency")),
    scheduled_at: validateIsoDate(
      requiredString(record, ["scheduled_at", "scheduled", "scheduledat"], "scheduled_at"),
      "scheduled_at"
    ),
    expected_value: optionalString(record, ["expected_value", "expected", "forecast_value", "forecast"]),
    actual_value: optionalString(record, ["actual_value", "actual"]),
    outcome_tone: tone as "DOVISH" | "NEUTRAL" | "HAWKISH" | null,
    source: optionalString(record, ["source"]),
  });
}

function importRiskSentiment(record: CsvRecord): void {
  const regime = normalizedEnum(requiredString(record, ["regime"], "regime"));
  if (regime !== "RISK_ON" && regime !== "NEUTRAL" && regime !== "RISK_OFF") {
    throw new ValidationError("regime must be RISK_ON, NEUTRAL, or RISK_OFF");
  }

  const dxyBias = normalizedEnum(requiredString(record, ["dxy_bias"], "dxy_bias"));
  const yieldsBias = normalizedEnum(requiredString(record, ["yields_bias"], "yields_bias"));
  const equitiesTone = normalizedEnum(requiredString(record, ["equities_tone"], "equities_tone"));
  const commoditiesTone = normalizedEnum(requiredString(record, ["commodities_tone"], "commodities_tone"));
  const threeWay = ["BULLISH", "NEUTRAL", "BEARISH"];
  if (!threeWay.includes(dxyBias) || !threeWay.includes(yieldsBias) || !threeWay.includes(equitiesTone) || !threeWay.includes(commoditiesTone)) {
    throw new ValidationError("dxy_bias, yields_bias, equities_tone, and commodities_tone must be BULLISH, NEUTRAL, or BEARISH");
  }

  createRiskSentiment({
    regime: regime as "RISK_ON" | "NEUTRAL" | "RISK_OFF",
    vix_level: optionalNumber(record, ["vix_level", "vix"]),
    dxy_bias: dxyBias as "BULLISH" | "NEUTRAL" | "BEARISH",
    yields_bias: yieldsBias as "BULLISH" | "NEUTRAL" | "BEARISH",
    equities_tone: equitiesTone as "BULLISH" | "NEUTRAL" | "BEARISH",
    commodities_tone: commoditiesTone as "BULLISH" | "NEUTRAL" | "BEARISH",
    notes: optionalString(record, ["notes"]),
    source: optionalString(record, ["source"]),
    recorded_at: validateIsoDate(requiredString(record, ["recorded_at", "recorded"], "recorded_at"), "recorded_at"),
  });
}

function importPositioning(record: CsvRecord): void {
  const bias = normalizedEnum(requiredString(record, ["bias"], "bias"));
  const conviction = normalizedEnum(requiredString(record, ["conviction"], "conviction"));
  if (bias !== "BULLISH" && bias !== "NEUTRAL" && bias !== "BEARISH") {
    throw new ValidationError("bias must be BULLISH, NEUTRAL, or BEARISH");
  }
  if (conviction !== "LOW" && conviction !== "MEDIUM" && conviction !== "HIGH") {
    throw new ValidationError("conviction must be LOW, MEDIUM, or HIGH");
  }

  createPositioning({
    currency: validateCurrency(requiredString(record, ["currency"], "currency")),
    bias: bias as "BULLISH" | "NEUTRAL" | "BEARISH",
    conviction: conviction as "LOW" | "MEDIUM" | "HIGH",
    net_position_ratio: optionalNumber(record, ["net_position_ratio", "net_ratio", "ratio"]),
    source: optionalString(record, ["source"]),
    notes: optionalString(record, ["notes"]),
    recorded_at: validateIsoDate(requiredString(record, ["recorded_at", "recorded"], "recorded_at"), "recorded_at"),
  });
}

function importRow(dataset: CsvImportDataset, row: CsvRecord): void {
  switch (dataset) {
    case "macro-indicators":
      importMacroIndicator(row);
      return;
    case "economic-events":
      importEconomicEvent(row);
      return;
    case "central-bank-events":
      importCentralBankEvent(row);
      return;
    case "risk-sentiment":
      importRiskSentiment(row);
      return;
    case "positioning":
      importPositioning(row);
      return;
    default:
      throw new ValidationError(`Unsupported dataset: ${dataset}`);
  }
}

export function importCsvForDataset(dataset: CsvImportDataset, csvText: string): CsvImportResult {
  const rawRows = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
    relax_column_count: true,
  }) as CsvRecord[];

  const rows = rawRows.map(normalizeRecord);
  const result: CsvImportResult = {
    dataset,
    totalRows: rows.length,
    inserted: 0,
    failed: 0,
    errors: [],
  };

  rows.forEach((row, idx) => {
    const rowNumber = idx + 2;
    try {
      importRow(dataset, row);
      result.inserted += 1;
    } catch (err: unknown) {
      result.failed += 1;
      const message = err instanceof Error ? err.message : "Unknown import error";
      result.errors.push({ row: rowNumber, message });
    }
  });

  return result;
}
