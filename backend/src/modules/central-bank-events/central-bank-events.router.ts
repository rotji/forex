import { Router, Request, Response } from "express";
import { getUpcomingCentralBankEvents, getCentralBankEventsByCurrency } from "./central-bank-events.service";
import { isValidCurrencyCode } from "../../ingestion/validation";

const router = Router();

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

export default router;
