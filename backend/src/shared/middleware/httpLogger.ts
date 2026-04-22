import morgan from "morgan";
import { env } from "../../config/env";

// Concise format in dev, minimal in production
export const httpLogger = morgan(env.NODE_ENV === "production" ? "combined" : "dev");
