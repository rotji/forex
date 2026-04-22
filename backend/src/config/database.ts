import Database from "better-sqlite3";
import path from "path";
import { env } from "./env";

const dbPath = path.resolve(env.DB_PATH);

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
  }
  return db;
}
