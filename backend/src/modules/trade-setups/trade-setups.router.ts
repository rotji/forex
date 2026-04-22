import { Router, Request, Response } from "express";
import { getActiveTradeSetups, getTradeSetupsByPair } from "./trade-setups.service";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  res.json(getActiveTradeSetups());
});

router.get("/:pair", (req: Request, res: Response) => {
  res.json(getTradeSetupsByPair(req.params.pair));
});

export default router;
