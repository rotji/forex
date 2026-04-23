import { Router, Request, Response } from "express";
import {
  getLatestCurrencyBiases,
  getLatestCurrencyBiasByCode,
  getCurrencyBiasHistoryByCode,
  getCurrencyBiasHistoryMap,
  recomputeCurrencyBiases,
} from "./currency-bias.service";
import { generateTradeAlertsFromBiases } from "../trade-alerts/trade-alerts.service";
import { isValidCurrencyCode } from "../../ingestion/validation";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  res.json(getLatestCurrencyBiases());
});

router.post("/recompute", (_req: Request, res: Response) => {
  const result = recomputeCurrencyBiases();
  const alerts = generateTradeAlertsFromBiases();
  res.status(201).json({
    count: result.rows.length,
    macroIndicatorsCount: result.macroIndicatorsCount,
    economicEventsCount: result.economicEventsCount,
    centralBankEventsCount: result.centralBankEventsCount,
    riskSentimentCount: result.riskSentimentCount,
    positioningCount: result.positioningCount,
    generatedAlertsCount: alerts.length,
    computedAt: new Date().toISOString(),
    rows: result.rows,
  });
});

router.get("/history", (req: Request, res: Response) => {
  const raw = req.query.limit;
  const limit = typeof raw === "string" ? Number(raw) : 8;
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(30, Math.floor(limit)) : 8;
  res.json(getCurrencyBiasHistoryMap(safeLimit));
});

router.get("/history/:code", (req: Request, res: Response) => {
  const code = Array.isArray(req.params.code) ? req.params.code[0] : req.params.code;
  if (!code || !isValidCurrencyCode(code.toUpperCase())) {
    res.status(400).json({ error: "Valid currency code is required" });
    return;
  }

  const raw = req.query.limit;
  const limit = typeof raw === "string" ? Number(raw) : 10;
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(50, Math.floor(limit)) : 10;
  res.json(getCurrencyBiasHistoryByCode(code, safeLimit));
});

router.get("/:code", (req: Request, res: Response) => {
  const code = Array.isArray(req.params.code) ? req.params.code[0] : req.params.code;
  if (!code || !isValidCurrencyCode(code.toUpperCase())) {
    res.status(400).json({ error: "Valid currency code is required" });
    return;
  }

  const row = getLatestCurrencyBiasByCode(code);
  if (!row) {
    res.status(404).json({ error: "Currency bias not found" });
    return;
  }

  res.json(row);
});

export default router;
