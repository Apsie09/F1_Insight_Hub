import type { PredictionService } from "../types/services";
import { apiPredictionService } from "./apiService";
import { predictionService as mockPredictionService } from "./mockApi";

const shouldUseMockOnly =
  process.env.NODE_ENV === "test" || process.env.EXPO_PUBLIC_USE_MOCK_API === "true";
const disableMockFallback = process.env.EXPO_PUBLIC_DISABLE_MOCK_FALLBACK === "true";

type DataEndpoint =
  | "seasons"
  | "racesBySeason"
  | "allRaces"
  | "featuredRaces"
  | "raceDetails"
  | "top10"
  | "raceParticipants"
  | "racerDetails"
  | "racers"
  | "calculatePrediction";

type EndpointSource = "api" | "mock";

export type PredictionDataSourceMode = "api" | "mock" | "mixed";

export type PredictionDataSourceSnapshot = {
  mode: PredictionDataSourceMode;
  apiCount: number;
  mockCount: number;
  endpoints: Partial<Record<DataEndpoint, EndpointSource>>;
};

const endpointSourceState: Partial<Record<DataEndpoint, EndpointSource>> = {};
const dataSourceListeners = new Set<() => void>();

const buildSnapshot = (): PredictionDataSourceSnapshot => {
  const values = Object.values(endpointSourceState);
  const apiCount = values.filter((value) => value === "api").length;
  const mockCount = values.filter((value) => value === "mock").length;

  let mode: PredictionDataSourceMode;
  if (shouldUseMockOnly) {
    mode = "mock";
  } else if (apiCount > 0 && mockCount > 0) {
    mode = "mixed";
  } else if (mockCount > 0) {
    mode = "mock";
  } else {
    mode = "api";
  }

  return {
    mode,
    apiCount,
    mockCount,
    endpoints: { ...endpointSourceState },
  };
};

let snapshotCache = buildSnapshot();

const notifyDataSourceChange = () => {
  snapshotCache = buildSnapshot();
  dataSourceListeners.forEach((listener) => listener());
};

const markEndpointSource = (endpoint: DataEndpoint, source: EndpointSource) => {
  if (endpointSourceState[endpoint] === source) {
    return;
  }

  endpointSourceState[endpoint] = source;
  notifyDataSourceChange();
};

export const getPredictionDataSourceSnapshot = (): PredictionDataSourceSnapshot => snapshotCache;

export const subscribePredictionDataSource = (listener: () => void): (() => void) => {
  dataSourceListeners.add(listener);
  return () => {
    dataSourceListeners.delete(listener);
  };
};

const warnFallback = (endpoint: string, reason: string, error?: unknown) => {
  if (!__DEV__) {
    return;
  }

  const suffix = error instanceof Error ? ` (${error.message})` : "";
  console.warn(`[predictionService] ${endpoint}: ${reason}. Using local fixtures${suffix}`);
};

const withFallback = async <T>(
  endpoint: DataEndpoint,
  apiCall: () => Promise<T>,
  mockCall: () => Promise<T>,
  options?: {
    fallbackOnEmptyArray?: boolean;
  }
): Promise<T> => {
  if (shouldUseMockOnly) {
    markEndpointSource(endpoint, "mock");
    return mockCall();
  }

  try {
    const apiValue = await apiCall();
    if (options?.fallbackOnEmptyArray && Array.isArray(apiValue) && apiValue.length === 0) {
      if (disableMockFallback) {
        throw new Error(
          `Backend endpoint '${endpoint}' returned an empty list. Seed backend data or unset EXPO_PUBLIC_DISABLE_MOCK_FALLBACK.`
        );
      }
      warnFallback(endpoint, "API returned an empty feed");
      markEndpointSource(endpoint, "mock");
      return mockCall();
    }

    markEndpointSource(endpoint, "api");
    return apiValue;
  } catch (error) {
    if (disableMockFallback) {
      throw error;
    }
    warnFallback(endpoint, "API request failed", error);
    markEndpointSource(endpoint, "mock");
    return mockCall();
  }
};

export const predictionService: PredictionService = {
  getSeasons: () =>
    withFallback("seasons", apiPredictionService.getSeasons, mockPredictionService.getSeasons, {
      fallbackOnEmptyArray: true,
    }),

  getRacesBySeason: (season) =>
    withFallback(
      "racesBySeason",
      () => apiPredictionService.getRacesBySeason(season),
      () => mockPredictionService.getRacesBySeason(season),
      { fallbackOnEmptyArray: true }
    ),

  getAllRaces: () =>
    withFallback("allRaces", apiPredictionService.getAllRaces, mockPredictionService.getAllRaces, {
      fallbackOnEmptyArray: true,
    }),

  getFeaturedRaces: () =>
    withFallback("featuredRaces", apiPredictionService.getFeaturedRaces, mockPredictionService.getFeaturedRaces, {
      fallbackOnEmptyArray: true,
    }),

  getRaceDetails: (raceId) =>
    withFallback(
      "raceDetails",
      () => apiPredictionService.getRaceDetails(raceId),
      () => mockPredictionService.getRaceDetails(raceId)
    ),

  getTop10Prediction: (raceId) =>
    withFallback(
      "top10",
      () => apiPredictionService.getTop10Prediction(raceId),
      () => mockPredictionService.getTop10Prediction(raceId),
      { fallbackOnEmptyArray: true }
    ),

  getRaceParticipants: (raceId) =>
    withFallback(
      "raceParticipants",
      () => apiPredictionService.getRaceParticipants(raceId),
      () => mockPredictionService.getRaceParticipants(raceId),
      { fallbackOnEmptyArray: true }
    ),

  getRacerDetails: (racerId, raceId) =>
    withFallback(
      "racerDetails",
      () => apiPredictionService.getRacerDetails(racerId, raceId),
      () => mockPredictionService.getRacerDetails(racerId, raceId)
    ),

  getRacers: () =>
    withFallback("racers", apiPredictionService.getRacers, mockPredictionService.getRacers, {
      fallbackOnEmptyArray: true,
    }),

  calculatePrediction: (input) =>
    withFallback(
      "calculatePrediction",
      () => apiPredictionService.calculatePrediction(input),
      () => mockPredictionService.calculatePrediction(input)
    ),
};
