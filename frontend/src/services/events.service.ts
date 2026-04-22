import { api } from "./api";
import type { EconomicEvent, CreateEconomicEventInput, UpdateEconomicEventInput } from "../types";

export const eventsService = {
  getUpcoming: () => api.get<EconomicEvent[]>("/events"),
  getHighImpact: () => api.get<EconomicEvent[]>("/events/high-impact"),
  getByCurrency: (code: string) => api.get<EconomicEvent[]>(`/events/currency/${code}`),
  create: (payload: CreateEconomicEventInput) => api.post<EconomicEvent, CreateEconomicEventInput>("/events", payload),
  update: (id: number, payload: UpdateEconomicEventInput) => api.put<EconomicEvent, UpdateEconomicEventInput>(`/events/${id}`, payload),
  remove: (id: number) => api.del(`/events/${id}`),
};
