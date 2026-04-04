import { apiPredictionService } from "./apiService";
import { predictionService as mockPredictionService } from "./mockApi";

const shouldUseMockService =
  process.env.NODE_ENV === "test" || process.env.EXPO_PUBLIC_USE_MOCK_API === "true";

export const predictionService = shouldUseMockService ? mockPredictionService : apiPredictionService;
