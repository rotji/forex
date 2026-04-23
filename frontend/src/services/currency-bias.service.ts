import { api } from "./api";
import type { CurrencyBiasSnapshot, CurrencyBiasHistoryMap, RecomputeBiasResponse } from "../types";

export const currencyBiasService = {
  getLatest: () => api.get<CurrencyBiasSnapshot[]>("/currency-bias"),
  getByCode: (code: string) => api.get<CurrencyBiasSnapshot>(`/currency-bias/${code}`),
  getHistoryMap: (limit = 8) => api.get<CurrencyBiasHistoryMap>(`/currency-bias/history?limit=${limit}`),
  getHistoryByCode: (code: string, limit = 10) =>
    api.get<CurrencyBiasSnapshot[]>(`/currency-bias/history/${code}?limit=${limit}`),
  recompute: () => api.post<RecomputeBiasResponse, Record<string, never>>("/currency-bias/recompute", {}),
};
