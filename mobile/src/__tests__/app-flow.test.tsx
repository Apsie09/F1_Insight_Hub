import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import App from "../../App";

describe("F1 Insight Hub app flow", () => {
  it("loads home and allows tab navigation", async () => {
    render(<App />);

    expect(await screen.findByText("F1 Insight Hub")).toBeOnTheScreen();
    expect(await screen.findByTestId("theme-toggle-switch")).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId("tab-browse"));
    expect(await screen.findByText("Browse by year")).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId("tab-prediction"));
    expect(await screen.findByText("Prediction Calculator")).toBeOnTheScreen();
  });

  it("filters races by selected year chips", async () => {
    render(<App />);

    fireEvent.press(await screen.findByTestId("tab-browse"));
    expect(await screen.findByTestId("race-card-2025-bahrain")).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId("year-chip-2024"));

    await waitFor(() => {
      expect(screen.getByTestId("race-card-2024-monaco")).toBeOnTheScreen();
    });
    expect(screen.queryByTestId("race-card-2025-bahrain")).toBeNull();
  });

  it("opens race details and drills down into racer details", async () => {
    render(<App />);

    fireEvent.press(await screen.findByTestId("tab-browse"));
    fireEvent.press(await screen.findByTestId("race-card-2025-bahrain"));

    expect(await screen.findByText("Predicted Top-10 Racers")).toBeOnTheScreen();

    fireEvent.press(await screen.findByTestId("racer-row-1"));
    expect(await screen.findByText("Career Snapshot")).toBeOnTheScreen();
  });

  it("submits prediction form and renders mocked result card", async () => {
    render(<App />);

    fireEvent.press(await screen.findByTestId("tab-prediction"));

    fireEvent.press(await screen.findByTestId("race-select-trigger"));
    fireEvent.press(await screen.findByTestId("race-select-option-2025-bahrain"));

    fireEvent.press(await screen.findByTestId("racer-select-trigger"));
    fireEvent.press(await screen.findByTestId("racer-select-option-max_verstappen"));

    fireEvent.changeText(screen.getByTestId("input-grid-position"), "2");
    fireEvent.press(screen.getByTestId("weather-chip-Dry"));
    fireEvent.press(screen.getByTestId("calc-submit-btn"));

    expect(await screen.findByText("Prediction Result")).toBeOnTheScreen();
    expect(await screen.findByText(/Confidence:/)).toBeOnTheScreen();
  });
});
