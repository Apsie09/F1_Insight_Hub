import { useMemo } from "react";
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
import { useRaceDetailsController } from "../controllers/useRaceDetailsController";
import { useLanguage } from "../i18n/LanguageProvider";
import { useAppTheme } from "../theme/AppThemeProvider";
import type { RaceDetailsParams } from "../types/navigation";
import { formatDate } from "../utils/format";

type RaceDetailsScreenProps = {
  route: { params: RaceDetailsParams };
  navigation: {
    navigate: (screen: string, params: unknown) => void;
  };
};

export const RaceDetailsScreen = ({ route, navigation }: RaceDetailsScreenProps) => {
  const { theme } = useAppTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { resource, openRacerDetails } = useRaceDetailsController(route.params, navigation);
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

  if (resource.status === "loading" || resource.status === "idle") {
    return (
      <View style={[styles.stateContainer, contentInsets]}>
        <LoadingState label={t("detailsPreparing")} />
      </View>
    );
  }

  if (resource.status === "error") {
    return (
      <View style={[styles.stateContainer, contentInsets]}>
        <ErrorState message={resource.error ?? t("detailsLoadError")} onRetry={resource.refresh} />
      </View>
    );
  }

  if (resource.status === "empty" || !resource.data) {
    return (
      <View style={[styles.stateContainer, contentInsets]}>
        <EmptyState
          title={t("detailsEmptyTitle")}
          message={t("detailsEmptyMessage")}
          actionLabel={t("commonReload")}
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
            {t("detailsSeason")} {race.season} - {t("commonRound")} {race.round} - {formatDate(race.date)}
          </Text>
          <Text style={styles.heroMeta}>
            {race.circuit} - {race.country}
          </Text>
        </View>

        <View style={styles.statsRow}>
          <StatCard label={t("detailsTrackLength")} value={`${context.trackLengthKm} km`} helper={t("detailsCircuitProfile")} />
          <StatCard label={t("detailsLaps")} value={context.laps} helper={t("detailsScheduledDistance")} />
          <StatCard label={t("detailsAltitude")} value={`${context.altitudeM} m`} helper={t("detailsVenueElevation")} />
        </View>

        <InfoCard title={t("detailsOvertakeDifficulty")} value={context.overtakeDifficulty} />

        <SectionHeader
          title={t("detailsPredictedTop10")}
          subtitle={t("detailsPredictedSubtitle")}
        />
        <PredictionTop10List
          entries={top10}
          onSelectRacer={openRacerDetails}
        />
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
  });
