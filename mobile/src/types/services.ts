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
import type {
  AuthNotification,
  AuthResponse,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from "./auth";

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
  getRaceParticipants(raceId: string): Promise<RacerProfile[]>;
  getRacerDetails(racerId: string, raceId: string): Promise<RacerDetailsResponse>;
  getRacers(): Promise<RacerProfile[]>;
  calculatePrediction(input: CalculatorInput): Promise<CalculatorResult>;
};

export type AuthService = {
  login(input: LoginInput): Promise<AuthResponse>;
  register(input: RegisterInput): Promise<AuthResponse>;
  me(token: string): Promise<AuthResponse["user"]>;
  logout(token: string): Promise<void>;
  getNotifications(token: string): Promise<AuthNotification[]>;
  markAllNotificationsRead(token: string): Promise<void>;
  resetPassword(token: string, input: ResetPasswordInput): Promise<void>;
};
