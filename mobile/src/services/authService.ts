import { apiAuthService } from "./apiAuthService";
import { mockAuthService } from "./mockAuthService";

const isJestRuntime = typeof jest !== "undefined";
const shouldUseMockAuth =
  isJestRuntime ||
  process.env.NODE_ENV === "test" ||
  process.env.EXPO_PUBLIC_USE_MOCK_API === "true" ||
  process.env.EXPO_PUBLIC_USE_MOCK_AUTH === "true";

export const authService = shouldUseMockAuth ? mockAuthService : apiAuthService;
