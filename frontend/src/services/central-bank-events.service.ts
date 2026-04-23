import { api } from "./api";
import type { CentralBankEvent } from "../types";

export const centralBankEventsService = {
  getUpcoming: () => api.get<CentralBankEvent[]>("/central-bank-events"),
  getByCurrency: (code: string) => api.get<CentralBankEvent[]>(`/central-bank-events/currency/${code}`),
};
