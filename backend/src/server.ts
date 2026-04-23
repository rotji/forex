import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { initDb } from "./db/connection";
import { env } from "./config/env";
import { startSignalEngineScheduler } from "./jobs/signalEngineScheduler";

initDb();
startSignalEngineScheduler(env.SIGNAL_ENGINE_INTERVAL_MS);

app.listen(env.PORT, () => {
  console.log(`Backend running on port ${env.PORT}`);
});
