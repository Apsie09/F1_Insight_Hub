export type FormTrend = "Rising" | "Stable" | "Falling";
export type WeatherCondition = "Dry" | "Mixed" | "Wet";
export type ConfidenceLevel = "Low" | "Medium" | "High";
export type OvertakeDifficulty = "Low" | "Medium" | "High";
export type PredictionSupport = "supported" | "historical_estimate";

export type Season = {
  year: number;
  label: string;
  totalRaces: number;
  championHint?: string;
  predictionSupport?: PredictionSupport;
  supportMessage?: string;
};

export type Race = {
  id: string;
  season: number;
  round: number;
  name: string;
  circuit: string;
  country: string;
  date: string;
  weatherForecast: WeatherCondition;
  spotlight?: boolean;
  predictionSupport?: PredictionSupport;
  supportMessage?: string;
};

export type RaceContext = {
  trackLengthKm: number;
  laps: number;
  altitudeM: number;
  overtakeDifficulty: OvertakeDifficulty;
  notes: string[];
};

export type Top10PredictionEntry = {
  rank: number;
  racerId: string;
  racerName: string;
  team: string;
  grid: number;
  qualifyingPosition: number;
  top10Probability: number;
  formTrend: FormTrend;
};

export type RacerProfile = {
  id: string;
  name: string;
  team: string;
  number: number;
  nationality: string;
  wins: number;
  podiums: number;
  championships: number;
  careerPoints: number;
  style: string;
  recentFormScore?: number;
};

export type RacerRaceContext = {
  raceId: string;
  lastFinish: number;
  avgFinishAtCircuit: number;
  constructorMomentum: number;
  note: string;
};

export type CalculatorInput = {
  season: number;
  raceId: string;
  racerId: string;
  gridPosition: number;
  weatherCondition: WeatherCondition;
};

export type CalculatorResult = {
  racerId: string;
  racerName: string;
  raceId: string;
  predictedTop10Probability: number;
  confidence: ConfidenceLevel;
  recentFormScore?: number;
  predictionSupport?: PredictionSupport;
  supportMessage?: string;
  reasoning: string[];
};
