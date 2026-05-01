import { useCallback, useEffect, useMemo, useState } from "react";

import { useAsyncResource } from "../hooks/useAsyncResource";
import { predictionService } from "../services/predictionService";
import type { BrowseStackParamList } from "../types/navigation";

type RaceBrowserNavigation = {
  navigate: <RouteName extends keyof BrowseStackParamList>(
    screen: RouteName,
    params: BrowseStackParamList[RouteName]
  ) => void;
};

export const useRaceBrowserController = (
  navigation: RaceBrowserNavigation,
  calendarSuffix: string,
  defaultTitle: string
) => {
  const [selectedYear, setSelectedYear] = useState<number>(0);

  const fetchSeasons = useCallback(() => predictionService.getSeasons(), []);
  const seasonsResource = useAsyncResource(fetchSeasons, {
    isEmpty: (value) => value.length === 0,
  });

  useEffect(() => {
    if (!selectedYear && seasonsResource.data?.length) {
      setSelectedYear(seasonsResource.data[0].year);
    }
  }, [selectedYear, seasonsResource.data]);

  const fetchRaces = useCallback(() => {
    if (!selectedYear) {
      return Promise.resolve([]);
    }
    return predictionService.getRacesBySeason(selectedYear);
  }, [selectedYear]);

  const racesResource = useAsyncResource(fetchRaces, {
    immediate: Boolean(selectedYear),
    dependencies: [selectedYear],
    isEmpty: (value) => value.length === 0,
  });

  const title = useMemo(() => {
    if (!selectedYear) {
      return defaultTitle;
    }

    return `${selectedYear} ${calendarSuffix}`;
  }, [calendarSuffix, defaultTitle, selectedYear]);

  const openRaceDetails = useCallback(
    (race: Awaited<ReturnType<typeof predictionService.getRacesBySeason>>[number]) => {
      navigation.navigate("RaceDetails", {
        raceId: race.id,
        season: race.season,
      });
    },
    [navigation]
  );

  return {
    selectedYear,
    setSelectedYear,
    seasonsResource,
    racesResource,
    title,
    openRaceDetails,
  };
};
