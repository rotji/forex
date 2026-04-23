import { Router, Request, Response } from "express";
import {
  getUpcomingCentralBankEvents,
  getCentralBankEventsByCurrency,
  createCentralBankEvent,
  updateCentralBankEvent,
  deleteCentralBankEvent,
} from "./central-bank-events.service";
import { isValidCurrencyCode, isValidISODate } from "../../ingestion/validation";
import { ValidationError } from "../../shared/errors/AppError";

const router = Router();

const VALID_EVENT_TYPES = ["RATE_DECISION", "SPEECH", "MINUTES", "PRESS_CONFERENCE", "INTERVENTION"] as const;
const VALID_TONES = ["DOVISH", "NEUTRAL", "HAWKISH"] as const;

router.get("/", (_req: Request, res: Response) => {
  res.json(getUpcomingCentralBankEvents());
});

router.get("/currency/:code", (req: Request, res: Response) => {
  const code = Array.isArray(req.params.code) ? req.params.code[0] : req.params.code;
  if (!code || !isValidCurrencyCode(code.toUpperCase())) {
    res.status(400).json({ error: "Valid currency code is required" });
    return;
  }

  res.json(getCentralBankEventsByCurrency(code));
});

interface CentralBankEventBody {
  bank_code?: unknown;
  bank_name?: unknown;
  title?: unknown;
  event_type?: unknown;
  currency?: unknown;
  scheduled_at?: unknown;
  expected_value?: unknown;
  actual_value?: unknown;
  outcome_tone?: unknown;
  source?: unknown;
}

function toOptionalString(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") throw new ValidationError("Optional fields must be strings");
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

router.post("/", (req: Request, res: Response) => {
  const body = req.body as CentralBankEventBody;

  if (typeof body.bank_code !== "string" || !body.bank_code.trim())
    throw new ValidationError("bank_code is required");
  if (typeof body.bank_name !== "string" || !body.bank_name.trim())
    throw new ValidationError("bank_name is required");
  if (typeof body.title !== "string" || !body.title.trim())
    throw new ValidationError("title is required");
  if (!VALID_EVENT_TYPES.includes(body.event_type as typeof VALID_EVENT_TYPES[number]))
    throw new ValidationError("event_type must be one of: " + VALID_EVENT_TYPES.join(", "));
  if (typeof body.currency !== "string" || !isValidCurrencyCode(body.currency.toUpperCase()))
    throw new ValidationError("currency must be a 3-letter code");
  if (typeof body.scheduled_at !== "string" || !isValidISODate(body.scheduled_at))
    throw new ValidationError("scheduled_at must be a valid ISO date string");
  if (body.outcome_tone !== undefined && body.outcome_tone !== null &&
      !VALID_TONES.includes(body.outcome_tone as typeof VALID_TONES[number]))
    throw new ValidationError("outcome_tone must be DOVISH, NEUTRAL, or HAWKISH");

  const created = createCentralBankEvent({
    bank_code: (body.bank_code as string).trim(),
    bank_name: (body.bank_name as string).trim(),
    title: (body.title as string).trim(),
    event_type: body.event_type as typeof VALID_EVENT_TYPES[number],
    currency: (body.currency as string).toUpperCase(),
    scheduled_at: body.scheduled_at as string,
    expected_value: toOptionalString(body.expected_value),
    actual_value: toOptionalString(body.actual_value),
    outcome_tone: (body.outcome_tone as typeof VALID_TONES[number] | null | undefined) ?? null,
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

  const body = req.body as CentralBankEventBody;
  const input: Record<string, unknown> = {};

  if (body.bank_code !== undefined) {
    if (typeof body.bank_code !== "string" || !body.bank_code.trim()) throw new ValidationError("bank_code must be non-empty");
    input.bank_code = body.bank_code.trim();
  }
  if (body.bank_name !== undefined) {
    if (typeof body.bank_name !== "string" || !body.bank_name.trim()) throw new ValidationError("bank_name must be non-empty");
    input.bank_name = body.bank_name.trim();
  }
  if (body.title !== undefined) {
    if (typeof body.title !== "string" || !body.title.trim()) throw new ValidationError("title must be non-empty");
    input.title = body.title.trim();
  }
  if (body.event_type !== undefined) {
    if (!VALID_EVENT_TYPES.includes(body.event_type as typeof VALID_EVENT_TYPES[number])) throw new ValidationError("invalid event_type");
    input.event_type = body.event_type;
  }
  if (body.currency !== undefined) {
    if (typeof body.currency !== "string" || !isValidCurrencyCode(body.currency.toUpperCase())) throw new ValidationError("currency must be a 3-letter code");
    input.currency = (body.currency as string).toUpperCase();
  }
  if (body.scheduled_at !== undefined) {
    if (typeof body.scheduled_at !== "string" || !isValidISODate(body.scheduled_at)) throw new ValidationError("scheduled_at must be a valid ISO date string");
    input.scheduled_at = body.scheduled_at;
  }
  if (body.expected_value !== undefined) input.expected_value = toOptionalString(body.expected_value);
  if (body.actual_value !== undefined) input.actual_value = toOptionalString(body.actual_value);
  if (body.outcome_tone !== undefined) {
    if (body.outcome_tone !== null && !VALID_TONES.includes(body.outcome_tone as typeof VALID_TONES[number]))
      throw new ValidationError("outcome_tone must be DOVISH, NEUTRAL, or HAWKISH");
    input.outcome_tone = body.outcome_tone ?? null;
  }
  if (body.source !== undefined) input.source = toOptionalString(body.source);

  const updated = updateCentralBankEvent(id, input as Parameters<typeof updateCentralBankEvent>[1]);
  if (!updated) {
    res.status(404).json({ error: "Central bank event not found" });
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

  const deleted = deleteCentralBankEvent(id);
  if (!deleted) {
    res.status(404).json({ error: "Central bank event not found" });
    return;
  }
  res.status(204).send();
});

export default router;
