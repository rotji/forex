import { api } from "./api";
import type { Signal, CreateSignalInput, UpdateSignalInput } from "../types";

export const signalsService = {
  getActive: () => api.get<Signal[]>("/signals"),
  getByPair: (pair: string) => api.get<Signal[]>(`/signals/${pair}`),
  create: (payload: CreateSignalInput) => api.post<Signal, CreateSignalInput>("/signals", payload),
  update: (id: number, payload: UpdateSignalInput) => api.put<Signal, UpdateSignalInput>(`/signals/${id}`, payload),
  remove: (id: number) => api.del(`/signals/${id}`),
};
