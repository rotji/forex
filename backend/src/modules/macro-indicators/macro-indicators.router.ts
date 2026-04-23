import { Router, Request, Response } from "express";
import {
  getLatestMacroIndicators,
  getMacroIndicatorsByCurrency,
  createMacroIndicator,
  updateMacroIndicator,
  deleteMacroIndicator,
} from "./macro-indicators.service";
import { isValidCurrencyCode, isValidISODate } from "../../ingestion/validation";
import { ValidationError } from "../../shared/errors/AppError";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  res.json(getLatestMacroIndicators());
});

router.get("/currency/:code", (req: Request, res: Response) => {
  const code = Array.isArray(req.params.code) ? req.params.code[0] : req.params.code;
  if (!code || !isValidCurrencyCode(code.toUpperCase())) {
    res.status(400).json({ error: "Valid currency code is required" });
    return;
  }

  res.json(getMacroIndicatorsByCurrency(code));
});

interface MacroIndicatorBody {
  indicator_code?: unknown;
  indicator_name?: unknown;
  currency?: unknown;
  value?: unknown;
  previous_value?: unknown;
  forecast_value?: unknown;
  unit?: unknown;
  importance?: unknown;
  signal_direction?: unknown;
  period?: unknown;
  released_at?: unknown;
  source?: unknown;
}

function toOptionalNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  if (isNaN(n)) throw new ValidationError("Numeric fields must be numbers");
  return n;
}

function toOptionalString(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") throw new ValidationError("Optional fields must be strings");
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

router.post("/", (req: Request, res: Response) => {
  const body = req.body as MacroIndicatorBody;

  if (typeof body.indicator_code !== "string" || !body.indicator_code.trim())
    throw new ValidationError("indicator_code is required");
  if (typeof body.indicator_name !== "string" || !body.indicator_name.trim())
    throw new ValidationError("indicator_name is required");
  if (typeof body.currency !== "string" || !isValidCurrencyCode(body.currency.toUpperCase()))
    throw new ValidationError("currency must be a 3-letter code");
  if (body.importance !== "LOW" && body.importance !== "MEDIUM" && body.importance !== "HIGH")
    throw new ValidationError("importance must be LOW, MEDIUM, or HIGH");
  if (body.signal_direction !== "HIGHER_IS_BULLISH" && body.signal_direction !== "LOWER_IS_BULLISH")
    throw new ValidationError("signal_direction must be HIGHER_IS_BULLISH or LOWER_IS_BULLISH");
  if (typeof body.released_at !== "string" || !isValidISODate(body.released_at))
    throw new ValidationError("released_at must be a valid ISO date string");

  const created = createMacroIndicator({
    indicator_code: body.indicator_code.trim(),
    indicator_name: body.indicator_name.trim(),
    currency: (body.currency as string).toUpperCase(),
    value: toOptionalNumber(body.value),
    previous_value: toOptionalNumber(body.previous_value),
    forecast_value: toOptionalNumber(body.forecast_value),
    unit: toOptionalString(body.unit),
    importance: body.importance,
    signal_direction: body.signal_direction,
    period: toOptionalString(body.period),
    released_at: body.released_at,
    source: toOptionalString(body.source),
  });

  res.status(201).json(created);
});

router.put("/:id", (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  if (Number.isNaN(id) || id <= 0) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const body = req.body as MacroIndicatorBody;
  const input: Record<string, unknown> = {};

  if (body.indicator_code !== undefined) {
    if (typeof body.indicator_code !== "string" || !body.indicator_code.trim()) throw new ValidationError("indicator_code must be non-empty");
    input.indicator_code = body.indicator_code.trim();
  }
  if (body.indicator_name !== undefined) {
    if (typeof body.indicator_name !== "string" || !body.indicator_name.trim()) throw new ValidationError("indicator_name must be non-empty");
    input.indicator_name = body.indicator_name.trim();
  }
  if (body.currency !== undefined) {
    if (typeof body.currency !== "string" || !isValidCurrencyCode(body.currency.toUpperCase())) throw new ValidationError("currency must be a 3-letter code");
    input.currency = (body.currency as string).toUpperCase();
  }
  if (body.value !== undefined) input.value = toOptionalNumber(body.value);
  if (body.previous_value !== undefined) input.previous_value = toOptionalNumber(body.previous_value);
  if (body.forecast_value !== undefined) input.forecast_value = toOptionalNumber(body.forecast_value);
  if (body.unit !== undefined) input.unit = toOptionalString(body.unit);
  if (body.importance !== undefined) {
    if (body.importance !== "LOW" && body.importance !== "MEDIUM" && body.importance !== "HIGH") throw new ValidationError("importance must be LOW, MEDIUM, or HIGH");
    input.importance = body.importance;
  }
  if (body.signal_direction !== undefined) {
    if (body.signal_direction !== "HIGHER_IS_BULLISH" && body.signal_direction !== "LOWER_IS_BULLISH") throw new ValidationError("signal_direction must be HIGHER_IS_BULLISH or LOWER_IS_BULLISH");
    input.signal_direction = body.signal_direction;
  }
  if (body.period !== undefined) input.period = toOptionalString(body.period);
  if (body.released_at !== undefined) {
    if (typeof body.released_at !== "string" || !isValidISODate(body.released_at)) throw new ValidationError("released_at must be a valid ISO date string");
    input.released_at = body.released_at;
  }
  if (body.source !== undefined) input.source = toOptionalString(body.source);

  const updated = updateMacroIndicator(id, input as Parameters<typeof updateMacroIndicator>[1]);
  if (!updated) {
    res.status(404).json({ error: "Macro indicator not found" });
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

  const deleted = deleteMacroIndicator(id);
  if (!deleted) {
    res.status(404).json({ error: "Macro indicator not found" });
    return;
  }
  res.status(204).send();
});

export default router;
