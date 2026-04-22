import { Router, Request, Response } from "express";
import { getAllPairs, getMajorPairs, getPairBySymbol } from "./currency-pairs.service";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  const pairs = getAllPairs();
  res.json(pairs);
});

router.get("/majors", (_req: Request, res: Response) => {
  const pairs = getMajorPairs();
  res.json(pairs);
});

router.get("/:symbol", (req: Request, res: Response) => {
  const symbol = Array.isArray(req.params.symbol) ? req.params.symbol[0] : req.params.symbol;
  if (!symbol) {
    res.status(400).json({ error: "Pair symbol is required" });
    return;
  }

  const pair = getPairBySymbol(symbol);
  if (!pair) {
    res.status(404).json({ error: "Pair not found" });
    return;
  }
  res.json(pair);
});

export default router;
