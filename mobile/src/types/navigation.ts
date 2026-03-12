export type RaceDetailsParams = {
  raceId: string;
  season: number;
};

export type RacerDetailsParams = {
  racerId: string;
  raceId: string;
};

export type HomeStackParamList = {
  Home: undefined;
  RaceDetails: RaceDetailsParams;
  RacerDetails: RacerDetailsParams;
};

export type BrowseStackParamList = {
  RaceBrowser: undefined;
  RaceDetails: RaceDetailsParams;
  RacerDetails: RacerDetailsParams;
};

export type PredictionStackParamList = {
  Prediction: undefined;
};

export type RootTabParamList = {
  HomeTab: undefined;
  BrowseTab: undefined;
  PredictionTab: undefined;
};
