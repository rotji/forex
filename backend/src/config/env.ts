import dotenv from "dotenv";
dotenv.config();

export const env = {
  PORT: Number(process.env.PORT || 5000),
  NODE_ENV: process.env.NODE_ENV || "development",
  DB_PATH: process.env.DB_PATH || "./data/forex.db",
  SIGNAL_ENGINE_INTERVAL_MS: Number(process.env.SIGNAL_ENGINE_INTERVAL_MS || 900000),
  ALERT_ARCHIVE_RETENTION_DAYS: Number(process.env.ALERT_ARCHIVE_RETENTION_DAYS || 14),
  OPS_RUN_KEY: process.env.OPS_RUN_KEY || "",
};
