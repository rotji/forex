import { Router, Request, Response } from "express";
import { getAllCurrencies, getCurrencyByCode } from "./currencies.service";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  const currencies = getAllCurrencies();
  res.json(currencies);
});

router.get("/:code", (req: Request, res: Response) => {
  const code = Array.isArray(req.params.code) ? req.params.code[0] : req.params.code;
  if (!code) {
    res.status(400).json({ error: "Currency code is required" });
    return;
  }

  const currency = getCurrencyByCode(code);
  if (!currency) {
    res.status(404).json({ error: "Currency not found" });
    return;
  }
  res.json(currency);
});

export default router;
