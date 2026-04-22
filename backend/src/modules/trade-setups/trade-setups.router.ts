import { Router, Request, Response } from "express";
import { getActiveTradeSetups, getTradeSetupsByPair } from "./trade-setups.service";

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

export default router;
