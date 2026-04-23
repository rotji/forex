import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import path from "node:path";

const dbPath = path.resolve(`./data/forex.ops.test.${Date.now()}.db`);

async function boot() {
  const connection = await import("../../db/connection");
  connection.initDb();
  const scheduler = await import("../../jobs/signalEngineScheduler");
  const appModule = await import("../../app");
  return { runSignalEngineCycle: scheduler.runSignalEngineCycle, app: appModule.default };
}

async function startServerAndGetBaseUrl(app: unknown) {
  const server = createServer(app as Parameters<typeof createServer>[0]);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  return { server, baseUrl: `http://127.0.0.1:${address.port}` };
}

async function closeServer(server: ReturnType<typeof createServer>): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

test.before(() => {
  process.env.DB_PATH = dbPath;
  process.env.SIGNAL_ENGINE_INTERVAL_MS = "600000";
  process.env.OPS_RUN_KEY = "test-key";
  process.env.INGESTION_MOCK_FAIL = "0";
});

test("ops health exposes ingestion freshness and telemetry fields", async () => {
  const { runSignalEngineCycle, app } = await boot();

  const cycle = await runSignalEngineCycle();
  assert.equal(cycle.success, true);

  const { server, baseUrl } = await startServerAndGetBaseUrl(app);

  const response = await fetch(`${baseUrl}/api/ops/health`);
  assert.equal(response.status, 200);

  const body = (await response.json()) as {
    healthy: boolean;
    dbReachable: boolean;
    schedulerEnabled: boolean;
    intervalMs: number | null;
    lastIngestionAt: string | null;
    lastIngestionAgeSeconds: number | null;
    lastIngestionProvider: string | null;
    lastIngestionMacroInserted: number;
    lastIngestionMacroUpdated: number;
    lastIngestionMacroSkipped: number;
    lastIngestionCbInserted: number;
    lastIngestionCbUpdated: number;
    lastIngestionCbSkipped: number;
    lastIngestionError: string | null;
    opsRunKeyConfigured: boolean;
  };

  assert.equal(body.dbReachable, true);
  assert.equal(body.schedulerEnabled, false);
  assert.equal(body.intervalMs, null);
  assert.equal(typeof body.healthy, "boolean");
  assert.equal(body.lastIngestionProvider, "mock-provider");
  assert.equal(typeof body.lastIngestionAt, "string");
  assert.equal(typeof body.lastIngestionAgeSeconds, "number");
  assert.equal(body.lastIngestionError, null);
  assert.equal(typeof body.lastIngestionMacroInserted, "number");
  assert.equal(typeof body.lastIngestionMacroUpdated, "number");
  assert.equal(typeof body.lastIngestionMacroSkipped, "number");
  assert.equal(typeof body.lastIngestionCbInserted, "number");
  assert.equal(typeof body.lastIngestionCbUpdated, "number");
  assert.equal(typeof body.lastIngestionCbSkipped, "number");
  assert.equal(body.opsRunKeyConfigured, true);

  await closeServer(server);
});

test("run ingestion now returns 401 with invalid ops key", async () => {
  const { app } = await boot();
  const { server, baseUrl } = await startServerAndGetBaseUrl(app);

  const response = await fetch(`${baseUrl}/api/ops/ingestion/run-now`, {
    method: "POST",
    headers: { "x-ops-run-key": "wrong-key" },
  });

  assert.equal(response.status, 401);
  const body = (await response.json()) as { error?: string };
  assert.equal(body.error, "Invalid operations key");

  await closeServer(server);
});

test("run ingestion now returns 200 with valid ops key", async () => {
  const envModule = await import("../../config/env");
  envModule.env.OPS_RUN_KEY = "test-key";

  const { app } = await boot();
  const { server, baseUrl } = await startServerAndGetBaseUrl(app);

  const response = await fetch(`${baseUrl}/api/ops/ingestion/run-now`, {
    method: "POST",
    headers: { "x-ops-run-key": "test-key" },
  });

  assert.equal(response.status, 200);
  const body = (await response.json()) as {
    message?: string;
    result?: { success?: boolean; provider?: string };
    runs?: unknown[];
  };
  assert.equal(body.message, "Ingestion cycle completed");
  assert.equal(body.result?.success, true);
  assert.equal(typeof body.result?.provider, "string");
  assert.ok(Array.isArray(body.runs));

  await closeServer(server);
});

test("run ingestion now returns 503 when ops key is not configured", async () => {
  const envModule = await import("../../config/env");
  const previousKey = envModule.env.OPS_RUN_KEY;
  envModule.env.OPS_RUN_KEY = "";

  try {
    const { app } = await boot();
    const { server, baseUrl } = await startServerAndGetBaseUrl(app);

    const response = await fetch(`${baseUrl}/api/ops/ingestion/run-now`, {
      method: "POST",
      headers: { "x-ops-run-key": "test-key" },
    });

    assert.equal(response.status, 503);
    const body = (await response.json()) as { error?: string };
    assert.equal(body.error, "OPS_RUN_KEY is not configured");

    await closeServer(server);
  } finally {
    envModule.env.OPS_RUN_KEY = previousKey;
  }
});
