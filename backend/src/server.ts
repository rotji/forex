import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { initDb } from "./db/connection";
import { env } from "./config/env";

initDb();

app.listen(env.PORT, () => {
  console.log(`Backend running on port ${env.PORT}`);
});
