import "@testing-library/jest-native/extend-expect";
import "react-native-gesture-handler/jestSetup";

import { resetMockScenarios, setMockLatency } from "./src/services/mockApi";

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

beforeEach(() => {
  resetMockScenarios();
  setMockLatency(0);
});
