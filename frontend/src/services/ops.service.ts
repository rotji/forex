import { api } from "./api";
import type {
  OpsHealthSummary,
  OpsRunAuditRecord,
  RunSignalEngineNowResponse,
  SignalEngineStatus,
} from "../types";

export const opsService = {
  getHealthSummary: () => api.get<OpsHealthSummary>("/ops/health"),
  getSignalEngineStatus: () => api.get<SignalEngineStatus>("/ops/signal-engine"),
  getRecentSignalEngineRuns: (limit = 5) =>
    api.get<OpsRunAuditRecord[]>(`/ops/signal-engine/runs?limit=${limit}`),
  runSignalEngineNow: (opsRunKey: string) =>
    api.post<RunSignalEngineNowResponse, Record<string, never>>(
      "/ops/signal-engine/run-now",
      {},
      { headers: { "x-ops-run-key": opsRunKey } },
    ),
};
