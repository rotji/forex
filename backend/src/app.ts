import express from "express";
import cors from "cors";
import helmet from "helmet";
import { requestLogger } from "./shared/middleware/requestLogger";
import { httpLogger } from "./shared/middleware/httpLogger";
import { globalRateLimiter } from "./shared/middleware/rateLimiter";
import { errorHandler } from "./shared/middleware/errorHandler";
import currenciesRouter from "./modules/currencies/currencies.router";
import pairsRouter from "./modules/currency-pairs/currency-pairs.router";
import eventsRouter from "./modules/economic-events/economic-events.router";
import signalsRouter from "./modules/signals/signals.router";
import setupsRouter from "./modules/trade-setups/trade-setups.router";

const app = express();

// Security
app.use(helmet());
app.use(cors());
app.use(globalRateLimiter);

// Body parsing
app.use(express.json());

// Logging
app.use(httpLogger);
app.use(requestLogger);

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "backend" });
});

app.use("/api/currencies", currenciesRouter);
app.use("/api/pairs", pairsRouter);
app.use("/api/events", eventsRouter);
app.use("/api/signals", signalsRouter);
app.use("/api/setups", setupsRouter);

app.use(errorHandler);

export default app;
