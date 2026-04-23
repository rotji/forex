import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

const dbPath = path.resolve(`./data/forex.ingestion.test.${Date.now()}.db`);

async function bootModules() {
  const connection = await import("../../db/connection");
  connection.initDb();
  const ingestion = await import("./ingestion.service");
  const scheduler = await import("../../jobs/signalEngineScheduler");
  const normalization = await import("../../ingestion/normalization");
  return { ingestion, scheduler, normalization };
}

test.before(() => {
  process.env.DB_PATH = dbPath;
  process.env.SIGNAL_ENGINE_INTERVAL_MS = "600000";
  process.env.INGESTION_MODE = "mock";
});

test("normalization handles valid inputs", async () => {
  const { normalization } = await bootModules();
  assert.equal(normalization.normalizePrice("1.2345"), 1.2345);
  assert.equal(normalization.normalizeImpact("high"), "HIGH");
});

test("ingestion upsert is idempotent across repeated runs", async () => {
  const { ingestion } = await bootModules();

  const first = await ingestion.runIngestionCycle();
  assert.equal(first.success, true);
  assert.ok(first.macroInserted > 0 || first.cbInserted > 0);

  const second = await ingestion.runIngestionCycle();
  assert.equal(second.success, true);
  assert.ok(second.macroUpdated > 0 || second.cbUpdated > 0);

  const latest = ingestion.getLatestIngestionRun() as { success: number } | undefined;
  assert.ok(latest);
  assert.equal(latest?.success, 1);
});

test("signal engine continues even if ingestion provider fails", async () => {
  const { scheduler } = await bootModules();

  process.env.INGESTION_MOCK_FAIL = "1";
  const result = await scheduler.runSignalEngineCycle();
  process.env.INGESTION_MOCK_FAIL = "0";

  assert.equal(result.success, true);
  assert.ok(result.ingestionError);
});
