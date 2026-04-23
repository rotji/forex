import { api } from "./api";
import type {
  IngestionRunRecord,
  OpsHealthSummary,
  OpsRunAuditRecord,
  RunIngestionNowResponse,
  RunSignalEngineNowResponse,
  SignalEngineStatus,
} from "../types";

export const opsService = {
  getHealthSummary: () => api.get<OpsHealthSummary>("/ops/health"),
  getSignalEngineStatus: () => api.get<SignalEngineStatus>("/ops/signal-engine"),
  getRecentSignalEngineRuns: (limit = 5) =>
    api.get<OpsRunAuditRecord[]>(`/ops/signal-engine/runs?limit=${limit}`),
  getRecentIngestionRuns: (limit = 5) =>
    api.get<IngestionRunRecord[]>(`/ops/ingestion/runs?limit=${limit}`),
  runIngestionNow: (opsRunKey: string) =>
    api.post<RunIngestionNowResponse, Record<string, never>>(
      "/ops/ingestion/run-now",
      {},
      { headers: { "x-ops-run-key": opsRunKey } },
    ),
  runSignalEngineNow: (opsRunKey: string) =>
    api.post<RunSignalEngineNowResponse, Record<string, never>>(
      "/ops/signal-engine/run-now",
      {},
      { headers: { "x-ops-run-key": opsRunKey } },
    ),
};
