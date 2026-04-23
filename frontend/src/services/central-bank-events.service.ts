import { api } from "./api";
import type { CentralBankEvent, CreateCentralBankEventInput, UpdateCentralBankEventInput } from "../types";

export const centralBankEventsService = {
  getUpcoming: () => api.get<CentralBankEvent[]>("/central-bank-events"),
  getByCurrency: (code: string) => api.get<CentralBankEvent[]>(`/central-bank-events/currency/${code}`),
  create: (input: CreateCentralBankEventInput) => api.post<CentralBankEvent>("/central-bank-events", input),
  update: (id: number, input: UpdateCentralBankEventInput) => api.put<CentralBankEvent>(`/central-bank-events/${id}`, input),
  remove: (id: number) => api.del(`/central-bank-events/${id}`),
};
