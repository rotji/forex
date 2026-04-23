import { Router, Request, Response } from "express";
import {
  getTradeAlerts,
  generateTradeAlertsFromBiases,
  acknowledgeTradeAlert,
  acknowledgeTradeAlerts,
  cleanupExpiredTradeAlerts,
} from "./trade-alerts.service";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  const raw = _req.query.status;
  const status = Array.isArray(raw) ? raw[0] : raw;
  const normalized = typeof status === "string" ? status.toUpperCase() : "ACTIVE";
  const allowed = new Set(["ACTIVE", "ACKNOWLEDGED", "EXPIRED", "ALL"]);

  if (!allowed.has(normalized)) {
    res.status(400).json({ error: "status must be ACTIVE, ACKNOWLEDGED, EXPIRED, or ALL" });
    return;
  }

  res.json(getTradeAlerts(normalized as "ACTIVE" | "ACKNOWLEDGED" | "EXPIRED" | "ALL"));
});

router.post("/generate", (_req: Request, res: Response) => {
  const alerts = generateTradeAlertsFromBiases();
  res.status(201).json({
    count: alerts.length,
    generatedAt: new Date().toISOString(),
    alerts,
  });
});

router.post("/:id/acknowledge", (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  if (Number.isNaN(id) || id <= 0) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const row = acknowledgeTradeAlert(id);
  if (!row) {
    res.status(404).json({ error: "Alert not found" });
    return;
  }

  res.json(row);
});

router.post("/acknowledge-bulk", (req: Request, res: Response) => {
  const ids = (req.body as { ids?: unknown }).ids;
  if (!Array.isArray(ids)) {
    res.status(400).json({ error: "ids must be an array of numbers" });
    return;
  }

  const parsed = ids.filter((id): id is number => typeof id === "number");
  const result = acknowledgeTradeAlerts(parsed);
  res.json(result);
});

router.post("/cleanup-expired", (req: Request, res: Response) => {
  const raw = (req.body as { olderThanDays?: unknown }).olderThanDays;
  const days = typeof raw === "number" ? raw : 14;
  const deleted = cleanupExpiredTradeAlerts(days);
  res.json({ deleted, olderThanDays: days });
});

export default router;
