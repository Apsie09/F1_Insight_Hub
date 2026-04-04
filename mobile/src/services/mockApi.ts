import {
  featuredRaceIds,
  raceContextsByRaceId,
  racerProfiles,
  races,
  seasons,
  top10PredictionsByRace,
} from "../data/mockFixtures";
import { clamp } from "../utils/format";
import type {
  CalculatorInput,
  CalculatorResult,
  RacerRaceContext,
  Top10PredictionEntry,
} from "../types/domain";
import type {
  MockEndpoint,
  PredictionService,
  ServiceScenario,
} from "../types/services";

let mockLatencyMs = 650;

const defaultScenarios: Record<MockEndpoint, ServiceScenario> = {
  seasons: "success",
  races: "success",
  raceDetails: "success",
  top10: "success",
  racerDetails: "success",
  calculator: "success",
  featuredRaces: "success",
  racers: "success",
};

const endpointScenarios: Record<MockEndpoint, ServiceScenario> = {
  ...defaultScenarios,
};

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const withScenario = async <T>(
  endpoint: MockEndpoint,
  successValue: () => T,
  emptyValue: () => T
): Promise<T> => {
  await delay(mockLatencyMs);
  const scenario = endpointScenarios[endpoint];

  if (scenario === "error") {
    throw new Error(`Mock ${endpoint} endpoint is unavailable.`);
  }

  if (scenario === "empty") {
    return emptyValue();
  }

  return successValue();
};

const raceMap = races.reduce<Record<string, (typeof races)[number]>>((acc, race) => {
  acc[race.id] = race;
  return acc;
}, {});

const racerMap = racerProfiles.reduce<Record<string, (typeof racerProfiles)[number]>>((acc, racer) => {
  acc[racer.id] = racer;
  return acc;
}, {});

const makeRacerRaceContext = (racerId: string, raceId: string): RacerRaceContext => {
  const prediction = top10PredictionsByRace[raceId]?.find((entry) => entry.racerId === racerId);
  const seed = racerId.length + raceId.length;

  return {
    raceId,
    lastFinish: prediction ? Math.max(1, prediction.rank + ((seed % 3) - 1)) : 12,
    avgFinishAtCircuit: prediction ? Number((prediction.rank + 1.6).toFixed(1)) : 12.8,
    constructorMomentum: prediction ? Math.round(clamp(prediction.top10Probability * 100, 40, 98)) : 44,
    note: prediction
      ? `${prediction.team} has maintained strong simulation pace in recent pre-race runs.`
      : "Limited historical race-context data. Confidence placeholder shown for demo.",
  };
};

const raceSorter = (a: (typeof races)[number], b: (typeof races)[number]) =>
  a.season === b.season ? a.round - b.round : b.season - a.season;

const rankConfidence = (probability: number): CalculatorResult["confidence"] => {
  if (probability >= 0.82) {
    return "High";
  }
  if (probability >= 0.64) {
    return "Medium";
  }
  return "Low";
};

const deriveRecentFormScore = (baselineProbability: number): number =>
  Math.round(clamp(35 + baselineProbability * 55, 0, 100));

const calculateFromInput = (input: CalculatorInput): CalculatorResult => {
  const racer = racerMap[input.racerId];
  const race = raceMap[input.raceId];
  const baselineEntry =
    top10PredictionsByRace[input.raceId]?.find((entry) => entry.racerId === input.racerId) ?? null;

  const baseline = baselineEntry?.top10Probability ?? 0.46;
  const recentFormScore = deriveRecentFormScore(baseline);
  const gridAdjustment = clamp((11 - input.gridPosition) * 0.014, -0.14, 0.14);
  const formAdjustment = clamp((recentFormScore - 50) / 500, -0.1, 0.1);
  const weatherAdjustment =
    input.weatherCondition === "Wet"
      ? -0.025
      : input.weatherCondition === "Mixed"
      ? -0.01
      : 0.012;

  const probability = clamp(baseline + gridAdjustment + formAdjustment + weatherAdjustment, 0.08, 0.96);

  return {
    racerId: input.racerId,
    racerName: racer?.name ?? "Unknown Driver",
    raceId: input.raceId,
    predictedTop10Probability: probability,
    confidence: rankConfidence(probability),
    recentFormScore,
    reasoning: [
      `${race?.name ?? "Selected race"} baseline model prior: ${Math.round(baseline * 100)}%.`,
      `Grid ${input.gridPosition} and backend-derived recent form score ${recentFormScore} adjusted the estimate.`,
      `${input.weatherCondition} condition profile applied via mocked variance curve.`,
    ],
  };
};

export const setEndpointScenario = (endpoint: MockEndpoint, scenario: ServiceScenario): void => {
  endpointScenarios[endpoint] = scenario;
};

export const resetMockScenarios = (): void => {
  (Object.keys(defaultScenarios) as MockEndpoint[]).forEach((endpoint) => {
    endpointScenarios[endpoint] = defaultScenarios[endpoint];
  });
};

export const setMockLatency = (ms: number): void => {
  mockLatencyMs = Math.max(0, Math.floor(ms));
};

export const getMockLatency = (): number => mockLatencyMs;

export const predictionService: PredictionService = {
  getSeasons: () =>
    withScenario(
      "seasons",
      () => [...seasons].sort((a, b) => b.year - a.year),
      () => []
    ),

  getRacesBySeason: (season) =>
    withScenario(
      "races",
      () => races.filter((race) => race.season === season).sort(raceSorter),
      () => []
    ),

  getAllRaces: () => withScenario("races", () => [...races].sort(raceSorter), () => []),

  getFeaturedRaces: () =>
    withScenario(
      "featuredRaces",
      () => featuredRaceIds.map((id) => raceMap[id]).filter(Boolean),
      () => []
    ),

  getRaceDetails: (raceId) =>
    withScenario(
      "raceDetails",
      () => {
        const race = raceMap[raceId];
        if (!race) {
          throw new Error("Race not found.");
        }

        return {
          race,
          context: raceContextsByRaceId[raceId] ?? {
            trackLengthKm: 5.0,
            laps: 60,
            altitudeM: 120,
            overtakeDifficulty: "Medium",
            notes: ["Context unavailable in fixture. Replace with API response later."],
          },
        };
      },
      () => {
        throw new Error("Race details empty.");
      }
    ),

  getTop10Prediction: (raceId) =>
    withScenario(
      "top10",
      () => [...(top10PredictionsByRace[raceId] ?? [])].sort((a, b) => a.rank - b.rank),
      () => []
    ),

  getRaceParticipants: (raceId) =>
    withScenario(
      "racers",
      () => {
        const entries = top10PredictionsByRace[raceId] ?? [];
        const entryByRacerId = new Map(entries.map((entry) => [entry.racerId, entry]));
        return racerProfiles
          .filter((racer) => entryByRacerId.has(racer.id))
          .map((racer) => ({
            ...racer,
            recentFormScore: deriveRecentFormScore(entryByRacerId.get(racer.id)?.top10Probability ?? 0.46),
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
      },
      () => []
    ),

  getRacerDetails: (racerId, raceId) =>
    withScenario(
      "racerDetails",
      () => {
        const profile = racerMap[racerId];
        if (!profile) {
          throw new Error("Racer not found.");
        }

        return {
          profile,
          raceContext: makeRacerRaceContext(racerId, raceId),
        };
      },
      () => {
        throw new Error("Racer details empty.");
      }
    ),

  getRacers: () =>
    withScenario(
      "racers",
      () => [...racerProfiles].sort((a, b) => a.name.localeCompare(b.name)),
      () => []
    ),

  calculatePrediction: (input: CalculatorInput) =>
    withScenario(
      "calculator",
      () => calculateFromInput(input),
      () => ({
        racerId: input.racerId,
        racerName: racerMap[input.racerId]?.name ?? "Unknown Driver",
        raceId: input.raceId,
        predictedTop10Probability: 0,
        confidence: "Low",
        reasoning: ["No mock calculator data available for this endpoint scenario."],
      })
    ),
};

export const getTopEntryForRace = (
  raceId: string,
  racerId: string
): Top10PredictionEntry | undefined =>
  top10PredictionsByRace[raceId]?.find((entry) => entry.racerId === racerId);
