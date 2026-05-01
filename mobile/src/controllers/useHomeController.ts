import { useCallback } from "react";

import { useAsyncResource } from "../hooks/useAsyncResource";
import { predictionService } from "../services/predictionService";
import type { HomeStackParamList } from "../types/navigation";

type HomeNavigation = {
  getParent: () => { navigate: (screen: string) => void } | undefined;
  navigate: <RouteName extends keyof HomeStackParamList>(
    screen: RouteName,
    params: HomeStackParamList[RouteName]
  ) => void;
};

type HomePayload = {
  seasons: Awaited<ReturnType<typeof predictionService.getSeasons>>;
  featuredRaces: Awaited<ReturnType<typeof predictionService.getFeaturedRaces>>;
};

export const useHomeController = (navigation: HomeNavigation) => {
  const fetchHome = useCallback<() => Promise<HomePayload>>(async () => {
    const [seasonData, featuredRaceData] = await Promise.all([
      predictionService.getSeasons(),
      predictionService.getFeaturedRaces(),
    ]);

    return {
      seasons: seasonData,
      featuredRaces: featuredRaceData,
    };
  }, []);

  const homeResource = useAsyncResource(fetchHome, {
    isEmpty: (value) => value.seasons.length === 0,
  });

  const openBrowse = useCallback(() => {
    navigation.getParent()?.navigate("BrowseTab");
  }, [navigation]);

  const openPrediction = useCallback(() => {
    navigation.getParent()?.navigate("PredictionTab");
  }, [navigation]);

  const openRaceDetails = useCallback(
    (race: HomePayload["featuredRaces"][number]) => {
      navigation.navigate("RaceDetails", {
        raceId: race.id,
        season: race.season,
      });
    },
    [navigation]
  );

  return {
    homeResource,
    openBrowse,
    openPrediction,
    openRaceDetails,
  };
};
