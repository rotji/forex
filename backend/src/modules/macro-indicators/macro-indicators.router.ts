import { Router, Request, Response } from "express";
import { getLatestMacroIndicators, getMacroIndicatorsByCurrency } from "./macro-indicators.service";
import { isValidCurrencyCode } from "../../ingestion/validation";

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

export default router;
