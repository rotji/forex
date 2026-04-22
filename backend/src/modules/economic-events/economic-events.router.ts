import { Router, Request, Response } from "express";
import { getUpcomingEvents, getEventsByCurrency, getHighImpactEvents } from "./economic-events.service";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  const limit = 20;
  const events = getUpcomingEvents(limit);
  res.json(events);
});

router.get("/high-impact", (_req: Request, res: Response) => {
  res.json(getHighImpactEvents());
});

router.get("/currency/:code", (req: Request, res: Response) => {
  res.json(getEventsByCurrency(req.params.code));
});

export default router;
