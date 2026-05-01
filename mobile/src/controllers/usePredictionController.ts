import { useCallback, useState } from "react";
import { Platform, Vibration } from "react-native";

import { useAsyncResource } from "../hooks/useAsyncResource";
import { useLanguage } from "../i18n/LanguageProvider";
import { predictionService } from "../services/predictionService";
import type { CalculatorInput, CalculatorResult, RacerProfile } from "../types/domain";

export const MODEL_PRESENTATION_DELAY_MS = process.env.NODE_ENV === "test" ? 0 : 5000;

type PredictionPayload = {
  seasons: Awaited<ReturnType<typeof predictionService.getSeasons>>;
  races: Awaited<ReturnType<typeof predictionService.getAllRaces>>;
};

const wait = (durationMs: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });

const notifyPredictionComplete = () => {
  Vibration.vibrate(Platform.OS === "ios" ? 80 : [0, 60, 40, 80]);
};

export const usePredictionController = () => {
  const { t } = useLanguage();
  const [submitPending, setSubmitPending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<CalculatorResult | null>(null);
  const [availableRacers, setAvailableRacers] = useState<RacerProfile[]>([]);
  const [racersLoading, setRacersLoading] = useState(false);
  const [racerLoadError, setRacerLoadError] = useState<string | null>(null);

  const fetchPayload = useCallback(async (): Promise<PredictionPayload> => {
    const [seasonData, raceData] = await Promise.all([
      predictionService.getSeasons(),
      predictionService.getAllRaces(),
    ]);
    return { seasons: seasonData, races: raceData };
  }, []);

  const resource = useAsyncResource(fetchPayload, {
    isEmpty: (value) => value.seasons.length === 0 || value.races.length === 0,
  });

  const handleSubmit = useCallback(
    async (input: CalculatorInput) => {
      setSubmitPending(true);
      setSubmitError(null);
      setResult(null);
      try {
        const [response] = await Promise.all([
          predictionService.calculatePrediction(input),
          wait(MODEL_PRESENTATION_DELAY_MS),
        ]);
        setResult(response);
        notifyPredictionComplete();
      } catch (error) {
        setSubmitError(error instanceof Error ? error.message : t("calcRequestFailed"));
        setResult(null);
      } finally {
        setSubmitPending(false);
      }
    },
    [t]
  );

  const handleRaceChange = useCallback(
    async (raceId: string) => {
      setResult(null);
      setSubmitError(null);
      setRacerLoadError(null);

      if (!raceId) {
        setAvailableRacers([]);
        return;
      }

      setRacersLoading(true);
      try {
        const participants = await predictionService.getRaceParticipants(raceId);
        setAvailableRacers(participants);
      } catch (error) {
        setAvailableRacers([]);
        setRacerLoadError(error instanceof Error ? error.message : t("calcRacersLoadFailed"));
      } finally {
        setRacersLoading(false);
      }
    },
    [t]
  );

  return {
    resource,
    submitPending,
    submitError,
    result,
    availableRacers,
    racersLoading,
    racerLoadError,
    handleSubmit,
    handleRaceChange,
  };
};
