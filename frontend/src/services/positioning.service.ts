import { api } from "./api";
import type {
  CreatePositioningInput,
  PositioningSnapshot,
  UpdatePositioningInput,
} from "../types";

export const positioningService = {
  getLatest: () => api.get<PositioningSnapshot[]>("/positioning"),
  getByCurrency: (code: string) => api.get<PositioningSnapshot[]>(`/positioning/currency/${code}`),
  create: (payload: CreatePositioningInput) => api.post<PositioningSnapshot, CreatePositioningInput>("/positioning", payload),
  update: (id: number, payload: UpdatePositioningInput) => api.put<PositioningSnapshot, UpdatePositioningInput>(`/positioning/${id}`, payload),
  remove: (id: number) => api.del(`/positioning/${id}`),
};