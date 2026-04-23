import express from "express";
import cors from "cors";
import helmet from "helmet";
import { requestLogger } from "./shared/middleware/requestLogger";
import { httpLogger } from "./shared/middleware/httpLogger";
import { globalRateLimiter } from "./shared/middleware/rateLimiter";
import { errorHandler } from "./shared/middleware/errorHandler";
import { env } from "./config/env";
import currenciesRouter from "./modules/currencies/currencies.router";
import pairsRouter from "./modules/currency-pairs/currency-pairs.router";
import eventsRouter from "./modules/economic-events/economic-events.router";
import signalsRouter from "./modules/signals/signals.router";
import setupsRouter from "./modules/trade-setups/trade-setups.router";
import macroIndicatorsRouter from "./modules/macro-indicators/macro-indicators.router";
import centralBankEventsRouter from "./modules/central-bank-events/central-bank-events.router";
import riskSentimentRouter from "./modules/risk-sentiment/risk-sentiment.router";
import positioningRouter from "./modules/positioning/positioning.router";
import dataImportRouter from "./modules/data-import/data-import.router";
import currencyBiasRouter from "./modules/currency-bias/currency-bias.router";
import tradeAlertsRouter from "./modules/trade-alerts/trade-alerts.router";
import opsRouter from "./modules/ops/ops.router";

const app = express();

// Security
app.use(helmet());
app.use(cors());
if (env.NODE_ENV !== "development") {
  app.use(globalRateLimiter);
}

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
app.use("/api/macro-indicators", macroIndicatorsRouter);
app.use("/api/central-bank-events", centralBankEventsRouter);
app.use("/api/risk-sentiment", riskSentimentRouter);
app.use("/api/positioning", positioningRouter);
app.use("/api/data-import", dataImportRouter);
app.use("/api/currency-bias", currencyBiasRouter);
app.use("/api/alerts", tradeAlertsRouter);
app.use("/api/ops", opsRouter);

app.use(errorHandler);

export default app;
