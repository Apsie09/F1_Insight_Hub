process.env.EXPO_PUBLIC_USE_MOCK_API = "true";
process.env.EXPO_PUBLIC_USE_MOCK_AUTH = "true";

import "@testing-library/jest-native/extend-expect";
import "react-native-gesture-handler/jestSetup";

import { resetMockScenarios, setMockLatency } from "./src/services/mockApi";
import { resetMockAuthUsers } from "./src/services/mockAuthService";

const mockSecureStoreCache = new Map<string, string>();

jest.mock("react-native-safe-area-context", () => {
  return jest.requireActual("react-native-safe-area-context/jest/mock").default;
});

jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    Ionicons: ({ name }: { name: string }) => React.createElement(Text, null, name),
  };
});

jest.mock("expo-font", () => {
  return {
    useFonts: () => [true],
  };
});

jest.mock("expo-secure-store", () => {
  return {
    getItemAsync: jest.fn(async (key: string) => mockSecureStoreCache.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      mockSecureStoreCache.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      mockSecureStoreCache.delete(key);
    }),
  };
});

beforeEach(() => {
  mockSecureStoreCache.clear();
  resetMockScenarios();
  setMockLatency(0);
  resetMockAuthUsers();
});
