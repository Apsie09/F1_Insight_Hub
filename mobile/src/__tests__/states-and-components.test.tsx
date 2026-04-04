import { fireEvent, render, screen } from "@testing-library/react-native";
import renderer from "react-test-renderer";

import App from "../../App";
import { RaceCard } from "../components/RaceCard";
import { RacerRowCard } from "../components/RacerRowCard";
import { StatCard } from "../components/StatCard";
import { races, top10PredictionsByRace } from "../data/mockFixtures";
import { setEndpointScenario, setMockLatency } from "../services/mockApi";
import { AppThemeProvider } from "../theme/AppThemeProvider";

describe("State coverage", () => {
  it("shows loading state while service waits", () => {
    setMockLatency(400);
    render(<App />);
    expect(screen.getByTestId("loading-state")).toBeOnTheScreen();
  });

  it("shows empty state when races endpoint returns empty", async () => {
    setEndpointScenario("races", "empty");
    render(<App />);

    fireEvent.press(await screen.findByTestId("tab-browse"));
    expect(await screen.findByText("No races available")).toBeOnTheScreen();
  });

  it("shows error state when top10 endpoint fails", async () => {
    setEndpointScenario("top10", "error");
    render(<App />);

    fireEvent.press(await screen.findByTestId("tab-browse"));
    fireEvent.press(await screen.findByTestId("race-card-2025-bahrain"));

    expect(await screen.findByTestId("error-state")).toBeOnTheScreen();
  });
});

describe("Component smoke snapshots", () => {
  it("renders RaceCard", () => {
    let tree: renderer.ReactTestRendererJSON | renderer.ReactTestRendererJSON[] | null = null;
    renderer.act(() => {
      tree = renderer
        .create(
          <AppThemeProvider>
            <RaceCard race={races[0]} onPress={() => undefined} />
          </AppThemeProvider>
        )
        .toJSON();
    });
    expect(tree).toMatchSnapshot();
  });

  it("renders RacerRowCard", () => {
    const entry = top10PredictionsByRace["2025-bahrain"][0];
    let tree: renderer.ReactTestRendererJSON | renderer.ReactTestRendererJSON[] | null = null;
    renderer.act(() => {
      tree = renderer
        .create(
          <AppThemeProvider>
            <RacerRowCard entry={entry} onPress={() => undefined} />
          </AppThemeProvider>
        )
        .toJSON();
    });
    expect(tree).toMatchSnapshot();
  });

  it("renders StatCard", () => {
    let tree: renderer.ReactTestRendererJSON | renderer.ReactTestRendererJSON[] | null = null;
    renderer.act(() => {
      tree = renderer
        .create(
          <AppThemeProvider>
            <StatCard label="Wins" value={12} helper="Career total" />
          </AppThemeProvider>
        )
        .toJSON();
    });
    expect(tree).toMatchSnapshot();
  });
});
