import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { env } from "./env";

const dbPath = path.resolve(env.DB_PATH);
const dbDirectory = path.dirname(dbPath);
type SqliteDatabase = InstanceType<typeof Database>;

let db: SqliteDatabase;

export function getDb(): SqliteDatabase {
  if (!db) {
    fs.mkdirSync(dbDirectory, { recursive: true });
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
  }
  return db;
}
