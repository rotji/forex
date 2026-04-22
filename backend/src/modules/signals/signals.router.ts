import { Router, Request, Response } from "express";
import { getActiveSignals, getSignalsByPair, createSignal, updateSignal, deleteSignal } from "./signals.service";
import { TIMEFRAMES } from "../../config/constants";
import { isValidPairSymbol, isValidISODate } from "../../ingestion/validation";
import { ValidationError } from "../../shared/errors/AppError";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  res.json(getActiveSignals());
});

router.get("/:pair", (req: Request, res: Response) => {
  const pair = Array.isArray(req.params.pair) ? req.params.pair[0] : req.params.pair;
  if (!pair) {
    res.status(400).json({ error: "Pair symbol is required" });
    return;
  }

  res.json(getSignalsByPair(pair));
});

interface CreateSignalBody {
  pairSymbol?: unknown;
  signalType?: unknown;
  timeframe?: unknown;
  strength?: unknown;
  reasoning?: unknown;
  expiresAt?: unknown;
}

function toOptionalNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new ValidationError("strength must be a valid number");
  }
  return value;
}

router.post("/", (req: Request, res: Response) => {
  const body = req.body as CreateSignalBody;

  if (typeof body.pairSymbol !== "string" || !isValidPairSymbol(body.pairSymbol.toUpperCase())) {
    throw new ValidationError("pairSymbol must be in format XXX/XXX");
  }
  if (body.signalType !== "BUY" && body.signalType !== "SELL" && body.signalType !== "NEUTRAL") {
    throw new ValidationError("signalType must be BUY, SELL, or NEUTRAL");
  }
  if (typeof body.timeframe !== "string" || !TIMEFRAMES.includes(body.timeframe as (typeof TIMEFRAMES)[number])) {
    throw new ValidationError("timeframe is invalid");
  }
  if (body.expiresAt !== undefined && body.expiresAt !== null) {
    if (typeof body.expiresAt !== "string" || !isValidISODate(body.expiresAt)) {
      throw new ValidationError("expiresAt must be a valid ISO date string");
    }
  }
  if (body.reasoning !== undefined && body.reasoning !== null && typeof body.reasoning !== "string") {
    throw new ValidationError("reasoning must be a string");
  }

  const created = createSignal({
    pairSymbol: body.pairSymbol.toUpperCase(),
    signalType: body.signalType,
    timeframe: body.timeframe,
    strength: toOptionalNumber(body.strength),
    reasoning: typeof body.reasoning === "string" ? body.reasoning.trim() : null,
    expiresAt: typeof body.expiresAt === "string" ? body.expiresAt : null,
  });

  res.status(201).json(created);
});

router.put("/:id", (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  if (Number.isNaN(id) || id <= 0) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const body = req.body as CreateSignalBody;
  const update: Record<string, unknown> = {};

  if (body.signalType !== undefined) {
    if (body.signalType !== "BUY" && body.signalType !== "SELL" && body.signalType !== "NEUTRAL") throw new ValidationError("signalType must be BUY, SELL, or NEUTRAL");
    update.signalType = body.signalType;
  }
  if (body.timeframe !== undefined) {
    if (typeof body.timeframe !== "string" || !TIMEFRAMES.includes(body.timeframe as (typeof TIMEFRAMES)[number])) throw new ValidationError("timeframe is invalid");
    update.timeframe = body.timeframe;
  }
  if ("strength" in body) update.strength = toOptionalNumber(body.strength);
  if ("reasoning" in body) {
    if (body.reasoning !== null && body.reasoning !== undefined && typeof body.reasoning !== "string") throw new ValidationError("reasoning must be a string");
    update.reasoning = body.reasoning ?? null;
  }
  if ("expiresAt" in body) {
    if (body.expiresAt !== null && body.expiresAt !== undefined) {
      if (typeof body.expiresAt !== "string" || !isValidISODate(body.expiresAt)) throw new ValidationError("expiresAt must be a valid ISO date string");
    }
    update.expiresAt = body.expiresAt ?? null;
  }

  const updated = updateSignal(id, update);
  if (!updated) {
    res.status(404).json({ error: "Signal not found" });
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
  const deleted = deleteSignal(id);
  if (!deleted) {
    res.status(404).json({ error: "Signal not found" });
    return;
  }
  res.status(204).send();
});

export default router;
