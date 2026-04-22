import { Router, Request, Response } from "express";
import { getActiveSignals, getSignalsByPair } from "./signals.service";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  res.json(getActiveSignals());
});

router.get("/:pair", (req: Request, res: Response) => {
  res.json(getSignalsByPair(req.params.pair));
});

export default router;
