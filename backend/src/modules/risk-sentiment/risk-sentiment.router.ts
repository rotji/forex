import { Request, Response, Router } from "express";
import { ValidationError } from "../../shared/errors/AppError";
import { isValidISODate } from "../../ingestion/validation";
import {
  createRiskSentiment,
  deleteRiskSentiment,
  getLatestRiskSentiment,
  updateRiskSentiment,
  type RiskRegime,
  type ThreeWayBias,
} from "./risk-sentiment.service";

const router = Router();

const REGIMES: RiskRegime[] = ["RISK_ON", "NEUTRAL", "RISK_OFF"];
const BIASES: ThreeWayBias[] = ["BULLISH", "NEUTRAL", "BEARISH"];

interface RiskSentimentBody {
  regime?: unknown;
  vix_level?: unknown;
  dxy_bias?: unknown;
  yields_bias?: unknown;
  equities_tone?: unknown;
  commodities_tone?: unknown;
  notes?: unknown;
  source?: unknown;
  recorded_at?: unknown;
}

function toOptionalNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) throw new ValidationError("Numeric fields must be numbers");
  return parsed;
}

function toOptionalString(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") throw new ValidationError("Optional fields must be strings");
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function assertRegime(value: unknown): asserts value is RiskRegime {
  if (!REGIMES.includes(value as RiskRegime)) {
    throw new ValidationError("regime must be RISK_ON, NEUTRAL, or RISK_OFF");
  }
}

function assertBias(value: unknown, field: string): asserts value is ThreeWayBias {
  if (!BIASES.includes(value as ThreeWayBias)) {
    throw new ValidationError(`${field} must be BULLISH, NEUTRAL, or BEARISH`);
  }
}

router.get("/", (_req: Request, res: Response) => {
  res.json(getLatestRiskSentiment());
});

router.post("/", (req: Request, res: Response) => {
  const body = req.body as RiskSentimentBody;
  assertRegime(body.regime);
  assertBias(body.dxy_bias, "dxy_bias");
  assertBias(body.yields_bias, "yields_bias");
  assertBias(body.equities_tone, "equities_tone");
  assertBias(body.commodities_tone, "commodities_tone");
  if (typeof body.recorded_at !== "string" || !isValidISODate(body.recorded_at)) {
    throw new ValidationError("recorded_at must be a valid ISO date string");
  }

  const created = createRiskSentiment({
    regime: body.regime,
    vix_level: toOptionalNumber(body.vix_level),
    dxy_bias: body.dxy_bias,
    yields_bias: body.yields_bias,
    equities_tone: body.equities_tone,
    commodities_tone: body.commodities_tone,
    notes: toOptionalString(body.notes),
    source: toOptionalString(body.source),
    recorded_at: body.recorded_at,
  });

  res.status(201).json(created);
});

router.put("/:id", (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  if (Number.isNaN(id) || id <= 0) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const body = req.body as RiskSentimentBody;
  const input: Record<string, unknown> = {};

  if (body.regime !== undefined) {
    assertRegime(body.regime);
    input.regime = body.regime;
  }
  if (body.vix_level !== undefined) input.vix_level = toOptionalNumber(body.vix_level);
  if (body.dxy_bias !== undefined) {
    assertBias(body.dxy_bias, "dxy_bias");
    input.dxy_bias = body.dxy_bias;
  }
  if (body.yields_bias !== undefined) {
    assertBias(body.yields_bias, "yields_bias");
    input.yields_bias = body.yields_bias;
  }
  if (body.equities_tone !== undefined) {
    assertBias(body.equities_tone, "equities_tone");
    input.equities_tone = body.equities_tone;
  }
  if (body.commodities_tone !== undefined) {
    assertBias(body.commodities_tone, "commodities_tone");
    input.commodities_tone = body.commodities_tone;
  }
  if (body.notes !== undefined) input.notes = toOptionalString(body.notes);
  if (body.source !== undefined) input.source = toOptionalString(body.source);
  if (body.recorded_at !== undefined) {
    if (typeof body.recorded_at !== "string" || !isValidISODate(body.recorded_at)) {
      throw new ValidationError("recorded_at must be a valid ISO date string");
    }
    input.recorded_at = body.recorded_at;
  }

  const updated = updateRiskSentiment(id, input);
  if (!updated) {
    res.status(404).json({ error: "Risk sentiment snapshot not found" });
    return;
  }
  res.json(updated);
});

router.delete("/:id", (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  if (Number.isNaN(id) || id <= 0) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const deleted = deleteRiskSentiment(id);
  if (!deleted) {
    res.status(404).json({ error: "Risk sentiment snapshot not found" });
    return;
  }

  res.status(204).send();
});

export default router;