import { useCallback, useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { InfoCard } from "../components/InfoCard";
import { LoadingState } from "../components/LoadingState";
import { PredictionTop10List } from "../components/PredictionTop10List";
import { ScreenFadeIn } from "../components/ScreenFadeIn";
import { SectionHeader } from "../components/SectionHeader";
import { StatCard } from "../components/StatCard";
import { APP_TAB_BAR_HEIGHT } from "../constants/layout";
import { fontFamily } from "../constants/theme";
import type { AppTheme } from "../constants/theme";
import { useAsyncResource } from "../hooks/useAsyncResource";
import { predictionService } from "../services/predictionService";
import { useAppTheme } from "../theme/AppThemeProvider";
import type { RaceDetailsParams } from "../types/navigation";
import { formatDate } from "../utils/format";

type RaceDetailsScreenProps = {
  route: { params: RaceDetailsParams };
  navigation: {
    navigate: (screen: string, params: unknown) => void;
  };
};

type RaceDetailPayload = {
  details: Awaited<ReturnType<typeof predictionService.getRaceDetails>>;
  top10: Awaited<ReturnType<typeof predictionService.getTop10Prediction>>;
};

export const RaceDetailsScreen = ({ route, navigation }: RaceDetailsScreenProps) => {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { raceId } = route.params;
  const tabBarHeight = APP_TAB_BAR_HEIGHT;
  const insets = useSafeAreaInsets();

  const contentInsets = useMemo(
    () => ({
      paddingLeft: theme.spacing.md + insets.left,
      paddingRight: theme.spacing.md + insets.right,
      paddingBottom: tabBarHeight + insets.bottom + theme.spacing.lg,
    }),
    [insets.bottom, insets.left, insets.right, tabBarHeight]
  );

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

  if (resource.status === "loading" || resource.status === "idle") {
    return (
      <View style={[styles.stateContainer, contentInsets]}>
        <LoadingState label="Preparing race board..." />
      </View>
    );
  }

  if (resource.status === "error") {
    return (
      <View style={[styles.stateContainer, contentInsets]}>
        <ErrorState message={resource.error ?? "Race detail load failed."} onRetry={resource.refresh} />
      </View>
    );
  }

  if (resource.status === "empty" || !resource.data) {
    return (
      <View style={[styles.stateContainer, contentInsets]}>
        <EmptyState
          title="No Top-10 entries"
          message="Prediction rows are empty for this race in the current backend response."
          actionLabel="Reload"
          onAction={resource.refresh}
        />
      </View>
    );
  }

  const { details, top10 } = resource.data;
  const { race, context } = details;

  return (
    <ScreenFadeIn>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, contentInsets]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>{race.name}</Text>
          <Text style={styles.heroSubTitle}>
            Season {race.season} - Round {race.round} - {formatDate(race.date)}
          </Text>
          <Text style={styles.heroMeta}>
            {race.circuit} - {race.country}
          </Text>
        </View>

        <View style={styles.statsRow}>
          <StatCard label="Track Length" value={`${context.trackLengthKm} km`} helper="Circuit profile" />
          <StatCard label="Laps" value={context.laps} helper="Scheduled distance" />
          <StatCard label="Altitude" value={`${context.altitudeM} m`} helper="Venue elevation" />
        </View>

        <InfoCard title="Overtake Difficulty" value={context.overtakeDifficulty} />

        <SectionHeader
          title="Predicted Top-10 Racers"
          subtitle="Tap a racer row to open full race-context details."
        />
        <PredictionTop10List
          entries={top10}
          onSelectRacer={(entry) =>
            navigation.navigate("RacerDetails", {
              racerId: entry.racerId,
              raceId: race.id,
            })
          }
        />

        <SectionHeader title="Race Context Blocks" subtitle="Additional telemetry assumptions from the backend feed." />
        <InfoCard title="Strategic Notes">
          {context.notes.map((note, index) => (
            <View key={`${note}-${index}`} style={styles.noteRow}>
              <View style={styles.noteDot} />
              <Text style={styles.noteText}>{note}</Text>
            </View>
          ))}
        </InfoCard>
      </ScrollView>
    </ScreenFadeIn>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      padding: theme.spacing.md,
      gap: theme.spacing.md,
      paddingBottom: theme.spacing.lg,
    },
    stateContainer: {
      flex: 1,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.background,
    },
    hero: {
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.raceHeroSurface,
      padding: theme.spacing.lg,
      gap: theme.spacing.xxs,
    },
    heroTitle: {
      fontFamily: fontFamily.headingBold,
      color: theme.colors.surface,
      fontSize: theme.typeScale.h1,
      lineHeight: 34,
    },
    heroSubTitle: {
      fontFamily: fontFamily.bodySemi,
      color: theme.colors.raceHeroSubtitle,
      fontSize: theme.typeScale.bodySmall,
    },
    heroMeta: {
      fontFamily: fontFamily.bodyRegular,
      color: theme.colors.raceHeroMeta,
      fontSize: theme.typeScale.body,
    },
    statsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
    },
    noteRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: theme.spacing.xs,
    },
    noteDot: {
      width: 8,
      height: 8,
      borderRadius: 8,
      backgroundColor: theme.colors.accent,
      marginTop: 6,
    },
    noteText: {
      flex: 1,
      fontFamily: fontFamily.bodyRegular,
      color: theme.colors.textSecondary,
      fontSize: theme.typeScale.body,
      lineHeight: 22,
    },
  });
