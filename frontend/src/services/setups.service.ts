import { api } from "./api";
import type { TradeSetup, CreateTradeSetupInput, UpdateTradeSetupInput } from "../types";

export const setupsService = {
  getActive: () => api.get<TradeSetup[]>("/setups"),
  getByPair: (pair: string) => api.get<TradeSetup[]>(`/setups/${pair}`),
  create: (payload: CreateTradeSetupInput) => api.post<TradeSetup, CreateTradeSetupInput>("/setups", payload),
  update: (id: number, payload: UpdateTradeSetupInput) => api.put<TradeSetup, UpdateTradeSetupInput>(`/setups/${id}`, payload),
  remove: (id: number) => api.del(`/setups/${id}`),
};
