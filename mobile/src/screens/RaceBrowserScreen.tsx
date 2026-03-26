import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { RaceCard } from "../components/RaceCard";
import { SectionHeader } from "../components/SectionHeader";
import { YearChipSelector } from "../components/YearChipSelector";
import { APP_TAB_BAR_HEIGHT } from "../constants/layout";
import type { AppTheme } from "../constants/theme";
import { useAsyncResource } from "../hooks/useAsyncResource";
import { predictionService } from "../services/mockApi";
import { useAppTheme } from "../theme/AppThemeProvider";
import type { BrowseStackParamList } from "../types/navigation";

type RaceBrowserScreenProps = NativeStackScreenProps<BrowseStackParamList, "RaceBrowser">;

export const RaceBrowserScreen = ({ navigation }: RaceBrowserScreenProps) => {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [selectedYear, setSelectedYear] = useState<number>(0);
  const tabBarHeight = APP_TAB_BAR_HEIGHT;
  const insets = useSafeAreaInsets();

  const contentInsets = useMemo(
    () => ({
      paddingLeft: theme.spacing.md + insets.left,
      paddingRight: theme.spacing.md + insets.right,
    }),
    [insets.left, insets.right]
  );

  const listInsets = useMemo(
    () => ({
      paddingBottom: tabBarHeight + insets.bottom + theme.spacing.lg,
    }),
    [insets.bottom, tabBarHeight]
  );

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
      <View style={[styles.content, contentInsets]}>
        <SectionHeader title="Browse by year" subtitle="Tap a season to filter available race cards." />
        <View style={styles.yearSelectorBlock}>
          <YearChipSelector
            years={seasonsResource.data.map((season) => season.year)}
            selectedYear={selectedYear}
            onSelect={setSelectedYear}
          />
        </View>

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
            style={styles.raceList}
            data={racesResource.data}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.listContent, listInsets]}
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
    );
  };

  return <View style={styles.container}>{renderBody()}</View>;
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      flex: 1,
      paddingTop: theme.spacing.md,
      gap: theme.spacing.md,
    },
    yearSelectorBlock: {
      zIndex: 2,
      marginBottom: theme.spacing.xs,
    },
    raceList: {
      flex: 1,
    },
    listContent: {
      paddingBottom: theme.spacing.lg,
    },
  });
