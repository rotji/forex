import { Router, Request, Response } from "express";
import {
  getActiveTradeSetups,
  getTradeSetupsByPair,
  createTradeSetup,
  updateTradeSetup,
  deleteTradeSetup,
} from "./trade-setups.service";
import { isValidPairSymbol } from "../../ingestion/validation";
import { ValidationError } from "../../shared/errors/AppError";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  res.json(getActiveTradeSetups());
});

router.get("/:pair", (req: Request, res: Response) => {
  const pair = Array.isArray(req.params.pair) ? req.params.pair[0] : req.params.pair;
  if (!pair) {
    res.status(400).json({ error: "Pair symbol is required" });
    return;
  }

  res.json(getTradeSetupsByPair(pair));
});

interface CreateTradeSetupBody {
  signalId?: unknown;
  pairSymbol?: unknown;
  entryPrice?: unknown;
  stopLoss?: unknown;
  takeProfit1?: unknown;
  takeProfit2?: unknown;
  takeProfit3?: unknown;
  riskRewardRatio?: unknown;
  lotSizeSuggestion?: unknown;
  notes?: unknown;
  status?: unknown;
}

const ALLOWED_STATUSES = ["PENDING", "ACTIVE", "HIT_TP", "HIT_SL", "CANCELLED"] as const;

function toRequiredNumber(value: unknown, fieldName: string): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new ValidationError(`${fieldName} must be a valid number`);
  }
  return value;
}

function toOptionalNumber(value: unknown, fieldName: string): number | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new ValidationError(`${fieldName} must be a valid number`);
  }
  return value;
}

router.post("/", (req: Request, res: Response) => {
  const body = req.body as CreateTradeSetupBody;

  if (typeof body.pairSymbol !== "string" || !isValidPairSymbol(body.pairSymbol.toUpperCase())) {
    throw new ValidationError("pairSymbol must be in format XXX/XXX");
  }
  if (body.status !== undefined && body.status !== null) {
    if (typeof body.status !== "string" || !ALLOWED_STATUSES.includes(body.status as (typeof ALLOWED_STATUSES)[number])) {
      throw new ValidationError("status is invalid");
    }
  }
  if (body.notes !== undefined && body.notes !== null && typeof body.notes !== "string") {
    throw new ValidationError("notes must be a string");
  }
  if (body.signalId !== undefined && body.signalId !== null) {
    if (typeof body.signalId !== "number" || !Number.isInteger(body.signalId) || body.signalId <= 0) {
      throw new ValidationError("signalId must be a positive integer");
    }
  }

  const created = createTradeSetup({
    signalId: (body.signalId as number | undefined) ?? null,
    pairSymbol: body.pairSymbol.toUpperCase(),
    entryPrice: toRequiredNumber(body.entryPrice, "entryPrice"),
    stopLoss: toRequiredNumber(body.stopLoss, "stopLoss"),
    takeProfit1: toRequiredNumber(body.takeProfit1, "takeProfit1"),
    takeProfit2: toOptionalNumber(body.takeProfit2, "takeProfit2"),
    takeProfit3: toOptionalNumber(body.takeProfit3, "takeProfit3"),
    riskRewardRatio: toOptionalNumber(body.riskRewardRatio, "riskRewardRatio"),
    lotSizeSuggestion: toOptionalNumber(body.lotSizeSuggestion, "lotSizeSuggestion"),
    notes: typeof body.notes === "string" ? body.notes.trim() : null,
    ...(typeof body.status === "string" ? { status: body.status as (typeof ALLOWED_STATUSES)[number] } : {}),
  });

  res.status(201).json(created);
});

router.put("/:id", (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  if (Number.isNaN(id) || id <= 0) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const body = req.body as CreateTradeSetupBody;
  const update: Record<string, unknown> = {};

  if (body.pairSymbol !== undefined) {
    if (typeof body.pairSymbol !== "string" || !isValidPairSymbol(body.pairSymbol.toUpperCase())) throw new ValidationError("pairSymbol must be in format XXX/XXX");
    update.pairSymbol = body.pairSymbol.toUpperCase();
  }
  if (body.status !== undefined) {
    if (typeof body.status !== "string" || !ALLOWED_STATUSES.includes(body.status as (typeof ALLOWED_STATUSES)[number])) throw new ValidationError("status is invalid");
    update.status = body.status;
  }
  if (body.entryPrice !== undefined) update.entryPrice = toRequiredNumber(body.entryPrice, "entryPrice");
  if (body.stopLoss !== undefined) update.stopLoss = toRequiredNumber(body.stopLoss, "stopLoss");
  if (body.takeProfit1 !== undefined) update.takeProfit1 = toRequiredNumber(body.takeProfit1, "takeProfit1");
  if ("takeProfit2" in body) update.takeProfit2 = toOptionalNumber(body.takeProfit2, "takeProfit2");
  if ("takeProfit3" in body) update.takeProfit3 = toOptionalNumber(body.takeProfit3, "takeProfit3");
  if ("riskRewardRatio" in body) update.riskRewardRatio = toOptionalNumber(body.riskRewardRatio, "riskRewardRatio");
  if ("lotSizeSuggestion" in body) update.lotSizeSuggestion = toOptionalNumber(body.lotSizeSuggestion, "lotSizeSuggestion");
  if ("notes" in body) {
    if (body.notes !== null && body.notes !== undefined && typeof body.notes !== "string") throw new ValidationError("notes must be a string");
    update.notes = typeof body.notes === "string" ? body.notes.trim() : null;
  }

  const updated = updateTradeSetup(id, update);
  if (!updated) {
    res.status(404).json({ error: "Setup not found" });
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
  const deleted = deleteTradeSetup(id);
  if (!deleted) {
    res.status(404).json({ error: "Setup not found" });
    return;
  }
  res.status(204).send();
});

export default router;
