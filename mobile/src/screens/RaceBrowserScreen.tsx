import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { RaceCard } from "../components/RaceCard";
import { ScreenFadeIn } from "../components/ScreenFadeIn";
import { SectionHeader } from "../components/SectionHeader";
import { YearChipSelector } from "../components/YearChipSelector";
import { fontFamily, theme } from "../constants/theme";
import { useAsyncResource } from "../hooks/useAsyncResource";
import { predictionService } from "../services/mockApi";
import type { BrowseStackParamList } from "../types/navigation";

type RaceBrowserScreenProps = NativeStackScreenProps<BrowseStackParamList, "RaceBrowser">;

export const RaceBrowserScreen = ({ navigation }: RaceBrowserScreenProps) => {
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
      return "Season race browser";
    }

    return `${selectedYear} race calendar`;
  }, [selectedYear]);

  const renderBody = () => {
    if (seasonsResource.status === "loading" || seasonsResource.status === "idle") {
      return <LoadingState label="Loading season menu..." />;
    }

    if (seasonsResource.status === "error") {
      return (
        <ErrorState
          message={seasonsResource.error ?? "Unable to load seasons."}
          onRetry={seasonsResource.refresh}
        />
      );
    }

    if (seasonsResource.status === "empty" || !seasonsResource.data) {
      return (
        <EmptyState
          title="No seasons found"
          message="Your mocked service returned zero seasons."
          actionLabel="Retry"
          onAction={seasonsResource.refresh}
        />
      );
    }

    return (
      <ScreenFadeIn>
        <View style={styles.content}>
          <SectionHeader title="Browse by year" subtitle="Tap a season to filter available race cards." />
          <YearChipSelector
            years={seasonsResource.data.map((season) => season.year)}
            selectedYear={selectedYear}
            onSelect={setSelectedYear}
          />

          <SectionHeader title={title} subtitle="Open a race to inspect Top-10 predictions and racer details." />
          {racesResource.status === "loading" || racesResource.status === "idle" ? (
            <LoadingState label="Loading race list..." />
          ) : null}
          {racesResource.status === "error" ? (
            <ErrorState message={racesResource.error ?? "Race list unavailable."} onRetry={racesResource.refresh} />
          ) : null}
          {racesResource.status === "empty" ? (
            <EmptyState
              title="No races available"
              message="This season has no race fixtures in the current mock scenario."
              actionLabel="Reload"
              onAction={racesResource.refresh}
            />
          ) : null}
          {racesResource.status === "success" && racesResource.data ? (
            <FlatList
              data={racesResource.data}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <RaceCard
                  race={item}
                  onPress={(race) =>
                    navigation.navigate("RaceDetails", {
                      raceId: race.id,
                      season: race.season,
                    })
                  }
                />
              )}
              ItemSeparatorComponent={() => <View style={{ height: theme.spacing.sm }} />}
              showsVerticalScrollIndicator={false}
            />
          ) : null}
        </View>
      </ScreenFadeIn>
    );
  };

  return <View style={styles.container}>{renderBody()}</View>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    gap: theme.spacing.md,
  },
  listContent: {
    paddingBottom: 100,
  },
  loadingLabel: {
    fontFamily: fontFamily.bodyRegular,
  },
  infoText: {
    fontFamily: fontFamily.bodyRegular,
  },
});
