import { api } from "./api";
import type {
  CreateRiskSentimentInput,
  RiskSentimentSnapshot,
  UpdateRiskSentimentInput,
} from "../types";

export const riskSentimentService = {
  getLatest: () => api.get<RiskSentimentSnapshot[]>("/risk-sentiment"),
  create: (payload: CreateRiskSentimentInput) =>
    api.post<RiskSentimentSnapshot, CreateRiskSentimentInput>("/risk-sentiment", payload),
  update: (id: number, payload: UpdateRiskSentimentInput) =>
    api.put<RiskSentimentSnapshot, UpdateRiskSentimentInput>(`/risk-sentiment/${id}`, payload),
  remove: (id: number) => api.del(`/risk-sentiment/${id}`),
};