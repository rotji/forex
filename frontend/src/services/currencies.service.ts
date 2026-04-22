import { api } from "./api";
import type { Currency } from "../types";

export const currenciesService = {
  getAll: () => api.get<Currency[]>("/currencies"),
  getByCode: (code: string) => api.get<Currency>(`/currencies/${code}`),
};
