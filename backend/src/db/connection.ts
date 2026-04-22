import { runMigrations } from "./migrations/001_initial";
import { runSeeds } from "./seeds/001_currencies";

export function initDb(): void {
  runMigrations();
  runSeeds();
}
