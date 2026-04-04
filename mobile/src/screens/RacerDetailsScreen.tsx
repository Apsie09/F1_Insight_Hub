import { useCallback, useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { InfoCard } from "../components/InfoCard";
import { LoadingState } from "../components/LoadingState";
import { ScreenFadeIn } from "../components/ScreenFadeIn";
import { SectionHeader } from "../components/SectionHeader";
import { StatCard } from "../components/StatCard";
import { APP_TAB_BAR_HEIGHT } from "../constants/layout";
import { fontFamily } from "../constants/theme";
import type { AppTheme } from "../constants/theme";
import { useAsyncResource } from "../hooks/useAsyncResource";
import { predictionService } from "../services/predictionService";
import { useAppTheme } from "../theme/AppThemeProvider";
import type { RacerDetailsParams } from "../types/navigation";

type RacerDetailsScreenProps = {
  route: { params: RacerDetailsParams };
};

type RacerDetailPayload = {
  racerDetails: Awaited<ReturnType<typeof predictionService.getRacerDetails>>;
  raceDetails: Awaited<ReturnType<typeof predictionService.getRaceDetails>>;
};

export const RacerDetailsScreen = ({ route }: RacerDetailsScreenProps) => {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { racerId, raceId } = route.params;
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

  const fetchPayload = useCallback(async (): Promise<RacerDetailPayload> => {
    const [racerDetails, raceDetails] = await Promise.all([
      predictionService.getRacerDetails(racerId, raceId),
      predictionService.getRaceDetails(raceId),
    ]);

    return { racerDetails, raceDetails };
  }, [racerId, raceId]);

  const resource = useAsyncResource(fetchPayload, {
    dependencies: [racerId, raceId],
  });

  if (resource.status === "loading" || resource.status === "idle") {
    return (
      <View style={[styles.stateContainer, contentInsets]}>
        <LoadingState label="Loading racer dossier..." />
      </View>
    );
  }

  if (resource.status === "error") {
    return (
      <View style={[styles.stateContainer, contentInsets]}>
        <ErrorState message={resource.error ?? "Unable to load racer details."} onRetry={resource.refresh} />
      </View>
    );
  }

  if (resource.status === "empty" || !resource.data) {
    return (
      <View style={[styles.stateContainer, contentInsets]}>
        <EmptyState
          title="No racer data"
          message="No racer profile was returned for this selection."
          actionLabel="Retry"
          onAction={resource.refresh}
        />
      </View>
    );
  }

  const { racerDetails, raceDetails } = resource.data;
  const { profile, raceContext } = racerDetails;

  return (
    <ScreenFadeIn>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, contentInsets]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={styles.heroName}>{profile.name}</Text>
          <Text style={styles.heroTeam}>
            {profile.team} - #{profile.number}
          </Text>
          <Text style={styles.heroMeta}>{profile.nationality}</Text>
        </View>

        <SectionHeader title="Career Snapshot" subtitle={profile.style} />
        <View style={styles.statsRow}>
          <StatCard label="Wins" value={profile.wins} />
          <StatCard label="Podiums" value={profile.podiums} />
          <StatCard label="Titles" value={profile.championships} />
          <StatCard label="Career Points" value={profile.careerPoints} />
        </View>

        <SectionHeader
          title="Selected Race Context"
          subtitle={`${raceDetails.race.name} (${raceDetails.race.season})`}
        />
        <InfoCard title="Race Context Note">
          <Text style={styles.contextCopy}>{raceContext.note}</Text>
        </InfoCard>

        <View style={styles.statsRow}>
          <StatCard label="Last Finish" value={`P${raceContext.lastFinish}`} />
          <StatCard label="Avg at Circuit" value={raceContext.avgFinishAtCircuit} />
          <StatCard label="Team Momentum" value={`${raceContext.constructorMomentum}%`} />
        </View>

        <SectionHeader
          title="Future Prediction Insights"
          subtitle="Reserved UI slot for confidence breakdown and model explanation."
        />
        <InfoCard title="Placeholder">
          <Text style={styles.contextCopy}>
            Backend and ML explanation payloads will surface here once integrated. Current values come from the backend feed.
          </Text>
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
      gap: theme.spacing.md,
      padding: theme.spacing.md,
      paddingBottom: theme.spacing.lg,
    },
    stateContainer: {
      flex: 1,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.background,
    },
    hero: {
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.lg,
      gap: theme.spacing.xxs,
    },
    heroName: {
      fontFamily: fontFamily.headingBold,
      color: theme.colors.textPrimary,
      fontSize: theme.typeScale.h1,
      lineHeight: 34,
    },
    heroTeam: {
      fontFamily: fontFamily.bodySemi,
      color: theme.colors.accent,
      fontSize: theme.typeScale.body,
    },
    heroMeta: {
      fontFamily: fontFamily.bodyRegular,
      color: theme.colors.textSecondary,
      fontSize: theme.typeScale.bodySmall,
    },
    statsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
    },
    contextCopy: {
      fontFamily: fontFamily.bodyRegular,
      color: theme.colors.textSecondary,
      fontSize: theme.typeScale.body,
      lineHeight: 22,
    },
  });
