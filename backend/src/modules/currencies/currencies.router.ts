import { Router, Request, Response } from "express";
import { getAllCurrencies, getCurrencyByCode } from "./currencies.service";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  const currencies = getAllCurrencies();
  res.json(currencies);
});

router.get("/:code", (req: Request, res: Response) => {
  const currency = getCurrencyByCode(req.params.code);
  if (!currency) {
    res.status(404).json({ error: "Currency not found" });
    return;
  }
  res.json(currency);
});

export default router;
