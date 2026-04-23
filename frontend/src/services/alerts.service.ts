import { api } from "./api";
import type {
  TradeAlert,
  GenerateAlertsResponse,
  AlertStatus,
  AcknowledgeBulkAlertsResponse,
  CleanupExpiredAlertsResponse,
} from "../types";

export const alertsService = {
  getByStatus: (status: AlertStatus) => api.get<TradeAlert[]>(`/alerts?status=${status}`),
  getActive: () => api.get<TradeAlert[]>("/alerts?status=ACTIVE"),
  generate: () => api.post<GenerateAlertsResponse, Record<string, never>>("/alerts/generate", {}),
  acknowledge: (id: number) => api.post<TradeAlert, Record<string, never>>(`/alerts/${id}/acknowledge`, {}),
  acknowledgeBulk: (ids: number[]) =>
    api.post<AcknowledgeBulkAlertsResponse, { ids: number[] }>("/alerts/acknowledge-bulk", { ids }),
  cleanupExpired: (olderThanDays = 14) =>
    api.post<CleanupExpiredAlertsResponse, { olderThanDays: number }>("/alerts/cleanup-expired", { olderThanDays }),
};
