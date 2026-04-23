import { Request, Response, Router } from "express";
import { isValidCurrencyCode, isValidISODate } from "../../ingestion/validation";
import { ValidationError } from "../../shared/errors/AppError";
import {
  createPositioning,
  deletePositioning,
  getLatestPositioning,
  getPositioningByCurrency,
  updatePositioning,
  type PositioningBias,
  type PositioningConviction,
} from "./positioning.service";

const router = Router();

const BIASES: PositioningBias[] = ["BULLISH", "NEUTRAL", "BEARISH"];
const CONVICTIONS: PositioningConviction[] = ["LOW", "MEDIUM", "HIGH"];

interface PositioningBody {
  currency?: unknown;
  bias?: unknown;
  conviction?: unknown;
  net_position_ratio?: unknown;
  source?: unknown;
  notes?: unknown;
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

router.get("/", (_req: Request, res: Response) => {
  res.json(getLatestPositioning());
});

router.get("/currency/:code", (req: Request, res: Response) => {
  const code = Array.isArray(req.params.code) ? req.params.code[0] : req.params.code;
  if (!code || !isValidCurrencyCode(code.toUpperCase())) {
    res.status(400).json({ error: "Valid currency code is required" });
    return;
  }

  res.json(getPositioningByCurrency(code));
});

router.post("/", (req: Request, res: Response) => {
  const body = req.body as PositioningBody;
  if (typeof body.currency !== "string" || !isValidCurrencyCode(body.currency.toUpperCase())) {
    throw new ValidationError("currency must be a 3-letter code");
  }
  if (!BIASES.includes(body.bias as PositioningBias)) {
    throw new ValidationError("bias must be BULLISH, NEUTRAL, or BEARISH");
  }
  if (!CONVICTIONS.includes(body.conviction as PositioningConviction)) {
    throw new ValidationError("conviction must be LOW, MEDIUM, or HIGH");
  }
  if (typeof body.recorded_at !== "string" || !isValidISODate(body.recorded_at)) {
    throw new ValidationError("recorded_at must be a valid ISO date string");
  }

  const created = createPositioning({
    currency: body.currency.toUpperCase(),
    bias: body.bias as PositioningBias,
    conviction: body.conviction as PositioningConviction,
    net_position_ratio: toOptionalNumber(body.net_position_ratio),
    source: toOptionalString(body.source),
    notes: toOptionalString(body.notes),
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

  const body = req.body as PositioningBody;
  const input: Record<string, unknown> = {};

  if (body.currency !== undefined) {
    if (typeof body.currency !== "string" || !isValidCurrencyCode(body.currency.toUpperCase())) {
      throw new ValidationError("currency must be a 3-letter code");
    }
    input.currency = body.currency.toUpperCase();
  }
  if (body.bias !== undefined) {
    if (!BIASES.includes(body.bias as PositioningBias)) {
      throw new ValidationError("bias must be BULLISH, NEUTRAL, or BEARISH");
    }
    input.bias = body.bias;
  }
  if (body.conviction !== undefined) {
    if (!CONVICTIONS.includes(body.conviction as PositioningConviction)) {
      throw new ValidationError("conviction must be LOW, MEDIUM, or HIGH");
    }
    input.conviction = body.conviction;
  }
  if (body.net_position_ratio !== undefined) input.net_position_ratio = toOptionalNumber(body.net_position_ratio);
  if (body.source !== undefined) input.source = toOptionalString(body.source);
  if (body.notes !== undefined) input.notes = toOptionalString(body.notes);
  if (body.recorded_at !== undefined) {
    if (typeof body.recorded_at !== "string" || !isValidISODate(body.recorded_at)) {
      throw new ValidationError("recorded_at must be a valid ISO date string");
    }
    input.recorded_at = body.recorded_at;
  }

  const updated = updatePositioning(id, input);
  if (!updated) {
    res.status(404).json({ error: "Positioning snapshot not found" });
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

  const deleted = deletePositioning(id);
  if (!deleted) {
    res.status(404).json({ error: "Positioning snapshot not found" });
    return;
  }
  res.status(204).send();
});

export default router;