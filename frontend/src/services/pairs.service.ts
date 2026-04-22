import { api } from "./api";
import type { CurrencyPair } from "../types";

export const pairsService = {
  getAll: () => api.get<CurrencyPair[]>("/pairs"),
  getMajors: () => api.get<CurrencyPair[]>("/pairs/majors"),
  getBySymbol: (symbol: string) => api.get<CurrencyPair>(`/pairs/${symbol}`),
};
