import { useCallback } from "react";

import { useAsyncResource } from "../hooks/useAsyncResource";
import { predictionService } from "../services/predictionService";
import type { RaceDetailsParams } from "../types/navigation";

type RacerDetailsNavigation = {
  navigate: (screen: "RacerDetails", params: { racerId: string; raceId: string }) => void;
};

type RaceDetailPayload = {
  details: Awaited<ReturnType<typeof predictionService.getRaceDetails>>;
  top10: Awaited<ReturnType<typeof predictionService.getTop10Prediction>>;
};

export const useRaceDetailsController = (
  routeParams: RaceDetailsParams,
  navigation: RacerDetailsNavigation
) => {
  const { raceId } = routeParams;

  const fetchRaceDetailPayload = useCallback(async (): Promise<RaceDetailPayload> => {
    const [details, top10] = await Promise.all([
      predictionService.getRaceDetails(raceId),
      predictionService.getTop10Prediction(raceId),
    ]);

    return { details, top10 };
  }, [raceId]);

  const resource = useAsyncResource(fetchRaceDetailPayload, {
    dependencies: [raceId],
    isEmpty: (value) => value.top10.length === 0,
  });

  const openRacerDetails = useCallback(
    (entry: RaceDetailPayload["top10"][number]) => {
      navigation.navigate("RacerDetails", {
        racerId: entry.racerId,
        raceId,
      });
    },
    [navigation, raceId]
  );

  return {
    raceId,
    resource,
    openRacerDetails,
  };
};
