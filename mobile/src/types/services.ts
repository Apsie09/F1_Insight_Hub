import type {
  CalculatorInput,
  CalculatorResult,
  Race,
  RaceContext,
  RacerProfile,
  RacerRaceContext,
  Season,
  Top10PredictionEntry,
} from "./domain";

export type ServiceScenario = "success" | "empty" | "error";

export type MockEndpoint =
  | "seasons"
  | "races"
  | "raceDetails"
  | "top10"
  | "racerDetails"
  | "calculator"
  | "featuredRaces"
  | "racers";

export type RaceDetailsResponse = {
  race: Race;
  context: RaceContext;
};

export type RacerDetailsResponse = {
  profile: RacerProfile;
  raceContext: RacerRaceContext;
};

export type PredictionService = {
  getSeasons(): Promise<Season[]>;
  getRacesBySeason(season: number): Promise<Race[]>;
  getAllRaces(): Promise<Race[]>;
  getFeaturedRaces(): Promise<Race[]>;
  getRaceDetails(raceId: string): Promise<RaceDetailsResponse>;
  getTop10Prediction(raceId: string): Promise<Top10PredictionEntry[]>;
  getRacerDetails(racerId: string, raceId: string): Promise<RacerDetailsResponse>;
  getRacers(): Promise<RacerProfile[]>;
  calculatePrediction(input: CalculatorInput): Promise<CalculatorResult>;
};
