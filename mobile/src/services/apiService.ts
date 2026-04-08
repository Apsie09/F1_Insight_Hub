import { Platform } from "react-native";

import { loadStoredAuthSession } from "../auth/sessionStorage";
import type { CalculatorInput } from "../types/domain";
import type {
  PredictionService,
  RaceDetailsResponse,
  RacerDetailsResponse,
} from "../types/services";

const resolveBaseUrl = (): string => {
  const configured = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  if (Platform.OS === "android") {
    return "http://10.0.2.2:8000";
  }

  return "http://127.0.0.1:8000";
};

const API_BASE_URL = resolveBaseUrl();

const buildUrl = (path: string, params?: Record<string, string | number | undefined>) => {
  const url = new URL(`${API_BASE_URL}${path}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined) {
        return;
      }
      url.searchParams.set(key, String(value));
    });
  }

  return url.toString();
};

const extractErrorMessage = async (response: Response): Promise<string> => {
  try {
    const payload = await response.json();
    if (typeof payload?.detail === "string") {
      return payload.detail;
    }
    if (Array.isArray(payload?.detail)) {
      return payload.detail.map((entry: { msg?: string } | unknown) => {
        if (typeof entry === "object" && entry !== null && "msg" in entry) {
          return String((entry as { msg?: string }).msg ?? entry);
        }
        return String(entry);
      }).join(", ");
    }
  } catch {
    // Fall through to status text.
  }

  return `${response.status} ${response.statusText || "Request failed"}`.trim();
};

const withAuthorizationHeader = async (headers?: HeadersInit): Promise<Headers> => {
  const resolvedHeaders = new Headers(headers);
  const storedSession = await loadStoredAuthSession();
  if (storedSession?.token && !resolvedHeaders.has("Authorization")) {
    resolvedHeaders.set("Authorization", `Bearer ${storedSession.token}`);
  }
  return resolvedHeaders;
};

const requestJson = async <T>(input: RequestInfo, init?: RequestInit): Promise<T> => {
  const response = await fetch(input, {
    ...init,
    headers: await withAuthorizationHeader(init?.headers),
  });
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }
  return (await response.json()) as T;
};

export const apiPredictionService: PredictionService = {
  getSeasons: () => requestJson(buildUrl("/seasons")),
  getRacesBySeason: (season) => requestJson(buildUrl(`/seasons/${season}/races`)),
  getAllRaces: () => requestJson(buildUrl("/races")),
  getFeaturedRaces: () => requestJson(buildUrl("/races/featured")),
  getRaceDetails: (raceId) => requestJson<RaceDetailsResponse>(buildUrl(`/races/${raceId}`)),
  getTop10Prediction: (raceId) => requestJson(buildUrl(`/races/${raceId}/predictions/top10`)),
  getRaceParticipants: (raceId) => requestJson(buildUrl(`/races/${raceId}/participants`)),
  getRacerDetails: (racerId, raceId) =>
    requestJson<RacerDetailsResponse>(buildUrl(`/races/${raceId}/racers/${racerId}`)),
  getRacers: () => requestJson(buildUrl("/racers")),
  calculatePrediction: (input: CalculatorInput) =>
    requestJson(buildUrl("/predictions/calculate"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    }),
};

export const apiBaseUrl = API_BASE_URL;
