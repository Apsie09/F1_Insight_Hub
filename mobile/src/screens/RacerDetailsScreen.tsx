import { useMemo } from "react";
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
import { useRacerDetailsController } from "../controllers/useRacerDetailsController";
import { useLanguage } from "../i18n/LanguageProvider";
import { useAppTheme } from "../theme/AppThemeProvider";
import type { RacerDetailsParams } from "../types/navigation";

type RacerDetailsScreenProps = {
  route: { params: RacerDetailsParams };
};

export const RacerDetailsScreen = ({ route }: RacerDetailsScreenProps) => {
  const { theme } = useAppTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { resource, insights } = useRacerDetailsController(route.params);
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
        <LoadingState label={t("racerLoading")} />
      </View>
    );
  }

  if (resource.status === "error") {
    return (
      <View style={[styles.stateContainer, contentInsets]}>
        <ErrorState message={resource.error ?? t("racerLoadError")} onRetry={resource.refresh} />
      </View>
    );
  }

  if (resource.status === "empty" || !resource.data) {
    return (
      <View style={[styles.stateContainer, contentInsets]}>
        <EmptyState
          title={t("racerEmptyTitle")}
          message={t("racerEmptyMessage")}
          actionLabel={t("commonRetry")}
          onAction={resource.refresh}
        />
      </View>
    );
  }

  const { racerDetails, raceDetails } = resource.data;
  const { profile, raceContext } = racerDetails;
  const resolvedInsights = insights ?? {
    momentumLabel: t("racerLow"),
    lastFinishInsight: "",
    circuitInsight: "",
    constructorInsight: "",
  };

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

        <SectionHeader title={t("racerCareerSnapshot")} subtitle={profile.style} />
        <View style={styles.statsRow}>
          <StatCard label={t("racerWins")} value={profile.wins} />
          <StatCard label={t("racerPodiums")} value={profile.podiums} />
          <StatCard label={t("racerTitles")} value={profile.championships} />
          <StatCard label={t("racerCareerPoints")} value={profile.careerPoints} />
        </View>

        <SectionHeader
          title={t("racerSelectedContext")}
          subtitle={`${raceDetails.race.name} (${raceDetails.race.season})`}
        />
        <InfoCard title={t("racerContextNote")}>
          <Text style={styles.contextCopy}>{raceContext.note}</Text>
        </InfoCard>

        <View style={styles.statsRow}>
          <StatCard label={t("racerLastFinish")} value={`P${raceContext.lastFinish}`} />
          <StatCard label={t("racerAvgCircuit")} value={raceContext.avgFinishAtCircuit} />
          <StatCard label={t("racerTeamMomentum")} value={`${raceContext.constructorMomentum}%`} />
        </View>

        <SectionHeader
          title={t("racerInsightsTitle")}
          subtitle={t("racerInsightsSubtitle")}
        />
        <InfoCard title={t("racerSignalSummary")} value={`${resolvedInsights.momentumLabel} ${t("racerTeamMomentum").toLowerCase()}`}>
          <View style={styles.insightList}>
            <View style={styles.insightRow}>
              <View style={styles.insightDot} />
              <Text style={styles.contextCopy}>
                {resolvedInsights.lastFinishInsight}
              </Text>
            </View>
            <View style={styles.insightRow}>
              <View style={styles.insightDot} />
              <Text style={styles.contextCopy}>
                {resolvedInsights.circuitInsight}
              </Text>
            </View>
            <View style={styles.insightRow}>
              <View style={styles.insightDot} />
              <Text style={styles.contextCopy}>
                {resolvedInsights.constructorInsight}
              </Text>
            </View>
          </View>
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
      flex: 1,
      fontFamily: fontFamily.bodyRegular,
      color: theme.colors.textSecondary,
      fontSize: theme.typeScale.body,
      lineHeight: 22,
    },
    insightList: {
      gap: theme.spacing.sm,
    },
    insightRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: theme.spacing.xs,
    },
    insightDot: {
      width: 8,
      height: 8,
      borderRadius: 8,
      backgroundColor: theme.colors.accent,
      marginTop: 7,
    },
  });
