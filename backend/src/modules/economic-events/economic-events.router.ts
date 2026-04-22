import { Router, Request, Response } from "express";
import {
  getUpcomingEvents,
  getEventsByCurrency,
  getHighImpactEvents,
  createEconomicEvent,
  updateEconomicEvent,
  deleteEconomicEvent,
} from "./economic-events.service";
import { isValidCurrencyCode, isValidISODate } from "../../ingestion/validation";
import { ValidationError } from "../../shared/errors/AppError";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  const limit = 20;
  const events = getUpcomingEvents(limit);
  res.json(events);
});

router.get("/high-impact", (_req: Request, res: Response) => {
  res.json(getHighImpactEvents());
});

router.get("/currency/:code", (req: Request, res: Response) => {
  const code = Array.isArray(req.params.code) ? req.params.code[0] : req.params.code;
  if (!code) {
    res.status(400).json({ error: "Currency code is required" });
    return;
  }

  res.json(getEventsByCurrency(code));
});

interface CreateEconomicEventBody {
  title?: unknown;
  currency?: unknown;
  impact?: unknown;
  scheduledAt?: unknown;
  actualValue?: unknown;
  forecastValue?: unknown;
  previousValue?: unknown;
  source?: unknown;
}

function toOptionalString(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") throw new ValidationError("Optional fields must be strings");
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

router.post("/", (req: Request, res: Response) => {
  const body = req.body as CreateEconomicEventBody;

  if (typeof body.title !== "string" || !body.title.trim()) {
    throw new ValidationError("title is required");
  }
  if (typeof body.currency !== "string" || !isValidCurrencyCode(body.currency.toUpperCase())) {
    throw new ValidationError("currency must be a 3-letter code");
  }
  if (body.impact !== "LOW" && body.impact !== "MEDIUM" && body.impact !== "HIGH") {
    throw new ValidationError("impact must be LOW, MEDIUM, or HIGH");
  }
  if (typeof body.scheduledAt !== "string" || !isValidISODate(body.scheduledAt)) {
    throw new ValidationError("scheduledAt must be a valid ISO date string");
  }

  const created = createEconomicEvent({
    title: body.title.trim(),
    currency: body.currency.toUpperCase(),
    impact: body.impact,
    scheduledAt: body.scheduledAt,
    actualValue: toOptionalString(body.actualValue),
    forecastValue: toOptionalString(body.forecastValue),
    previousValue: toOptionalString(body.previousValue),
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

  const body = req.body as CreateEconomicEventBody;
  const update: Record<string, unknown> = {};

  if (body.title !== undefined) {
    if (typeof body.title !== "string" || !body.title.trim()) throw new ValidationError("title must be a non-empty string");
    update.title = body.title.trim();
  }
  if (body.currency !== undefined) {
    if (typeof body.currency !== "string" || !isValidCurrencyCode(body.currency.toUpperCase())) throw new ValidationError("currency must be a 3-letter code");
    update.currency = body.currency.toUpperCase();
  }
  if (body.impact !== undefined) {
    if (body.impact !== "LOW" && body.impact !== "MEDIUM" && body.impact !== "HIGH") throw new ValidationError("impact must be LOW, MEDIUM, or HIGH");
    update.impact = body.impact;
  }
  if (body.scheduledAt !== undefined) {
    if (typeof body.scheduledAt !== "string" || !isValidISODate(body.scheduledAt)) throw new ValidationError("scheduledAt must be a valid ISO date string");
    update.scheduledAt = body.scheduledAt;
  }
  if ("actualValue" in body) update.actualValue = toOptionalString(body.actualValue);
  if ("forecastValue" in body) update.forecastValue = toOptionalString(body.forecastValue);
  if ("previousValue" in body) update.previousValue = toOptionalString(body.previousValue);
  if ("source" in body) update.source = toOptionalString(body.source);

  const updated = updateEconomicEvent(id, update);
  if (!updated) {
    res.status(404).json({ error: "Event not found" });
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
  const deleted = deleteEconomicEvent(id);
  if (!deleted) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  res.status(204).send();
});

export default router;
