import { useCallback, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { RaceCard } from "../components/RaceCard";
import { SectionHeader } from "../components/SectionHeader";
import { APP_TAB_BAR_HEIGHT } from "../constants/layout";
import { fontFamily } from "../constants/theme";
import type { AppTheme } from "../constants/theme";
import { useAsyncResource } from "../hooks/useAsyncResource";
import { predictionService } from "../services/predictionService";
import { useAppTheme } from "../theme/AppThemeProvider";
import type { HomeStackParamList } from "../types/navigation";

type HomeScreenProps = NativeStackScreenProps<HomeStackParamList, "Home">;

type HomePayload = {
  seasons: Awaited<ReturnType<typeof predictionService.getSeasons>>;
  featuredRaces: Awaited<ReturnType<typeof predictionService.getFeaturedRaces>>;
};

export const HomeScreen = ({ navigation }: HomeScreenProps) => {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const tabBarHeight = APP_TAB_BAR_HEIGHT;
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isCompactWidth = width < 380;

  const contentInsets = useMemo(
    () => ({
      paddingLeft: theme.spacing.md + insets.left,
      paddingRight: theme.spacing.md + insets.right,
      paddingBottom: tabBarHeight + insets.bottom + theme.spacing.lg,
    }),
    [insets.bottom, insets.left, insets.right, tabBarHeight]
  );

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

  const openBrowse = () => navigation.getParent()?.navigate("BrowseTab" as never);
  const openPrediction = () => navigation.getParent()?.navigate("PredictionTab" as never);

  const renderBody = () => {
    if (homeResource.status === "loading" || homeResource.status === "idle") {
      return <LoadingState />;
    }

    if (homeResource.status === "error") {
      return <ErrorState message={homeResource.error ?? "Unable to load dashboard."} onRetry={homeResource.refresh} />;
    }

    if (homeResource.status === "empty" || !homeResource.data) {
      return (
        <EmptyState
          title="No season feed"
          message="Mock season data is empty. Switch the service scenario to success to continue."
          actionLabel="Reload"
          onAction={homeResource.refresh}
        />
      );
    }

    const { seasons, featuredRaces } = homeResource.data;

    return (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, contentInsets]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={[styles.heroShapeLarge, isCompactWidth && styles.heroShapeLargeCompact]} />
          <View style={[styles.heroShapeSmall, isCompactWidth && styles.heroShapeSmallCompact]} />
          <Text style={styles.heroTag}>Telemetry Motorsport UI</Text>
          <Text style={[styles.heroTitle, isCompactWidth && styles.heroTitleCompact]}>F1 Insight Hub</Text>
          <Text style={styles.heroSubtitle}>
            Browse races by season, inspect Top-10 projections, and explore racer-level context.
          </Text>
          <View style={[styles.heroActions, isCompactWidth && styles.heroActionsCompact]}>
            <Pressable style={styles.primaryButton} onPress={openBrowse} testID="home-open-browse">
              <Text style={styles.primaryButtonText}>Browse Seasons</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={openPrediction} testID="home-open-prediction">
              <Text style={styles.secondaryButtonText}>Open Calculator</Text>
            </Pressable>
          </View>
        </View>

        <View style={[styles.metricRow, isCompactWidth && styles.metricRowCompact]}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Active Seasons</Text>
            <Text style={styles.metricValue}>{seasons.length}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Tracked Races</Text>
            <Text style={styles.metricValue}>{seasons.reduce((total, season) => total + season.totalRaces, 0)}</Text>
          </View>
        </View>

        <SectionHeader title="Featured Race Boards" subtitle="Direct links into race-level prediction details." />
        <View style={styles.featuredList}>
          {featuredRaces.map((race) => (
            <RaceCard
              key={race.id}
              race={race}
              onPress={(selectedRace) =>
                navigation.navigate("RaceDetails", {
                  raceId: selectedRace.id,
                  season: selectedRace.season,
                })
              }
            />
          ))}
        </View>
      </ScrollView>
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
    scroll: {
      flex: 1,
    },
    content: {
      padding: theme.spacing.md,
      gap: theme.spacing.lg,
      paddingBottom: theme.spacing.xxl,
    },
    hero: {
      backgroundColor: theme.colors.heroSurface,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.lg,
      overflow: "hidden",
      gap: theme.spacing.sm,
    },
    heroShapeLarge: {
      position: "absolute",
      width: 220,
      height: 220,
      borderRadius: 220,
      backgroundColor: theme.colors.heroShapeLarge,
      top: -60,
      right: -70,
    },
    heroShapeLargeCompact: {
      width: 170,
      height: 170,
      borderRadius: 170,
      top: -50,
      right: -56,
    },
    heroShapeSmall: {
      position: "absolute",
      width: 120,
      height: 120,
      borderRadius: 120,
      backgroundColor: theme.colors.heroShapeSmall,
      bottom: -30,
      left: -20,
    },
    heroShapeSmallCompact: {
      width: 90,
      height: 90,
      borderRadius: 90,
      bottom: -24,
    },
    heroTag: {
      fontFamily: fontFamily.bodySemi,
      color: theme.colors.heroTag,
      fontSize: theme.typeScale.caption,
      textTransform: "uppercase",
      letterSpacing: 1.2,
    },
    heroTitle: {
      fontFamily: fontFamily.headingBold,
      color: "#FFFFFF",
      fontSize: theme.typeScale.hero,
      lineHeight: 46,
    },
    heroTitleCompact: {
      fontSize: 36,
      lineHeight: 38,
    },
    heroSubtitle: {
      fontFamily: fontFamily.bodyRegular,
      color: theme.colors.heroSubtitle,
      fontSize: theme.typeScale.body,
      lineHeight: 21,
    },
    heroActions: {
      marginTop: theme.spacing.sm,
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    heroActionsCompact: {
      flexDirection: "column",
    },
    primaryButton: {
      flex: 1,
      minHeight: 44,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.accent,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: theme.spacing.sm,
    },
    primaryButtonText: {
      fontFamily: fontFamily.bodyBold,
      color: theme.colors.surface,
      fontSize: theme.typeScale.body,
    },
    secondaryButton: {
      flex: 1,
      minHeight: 44,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.secondaryBorder,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: theme.spacing.sm,
    },
    secondaryButtonText: {
      fontFamily: fontFamily.bodySemi,
      color: "#FFFFFF",
      fontSize: theme.typeScale.body,
    },
    metricRow: {
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    metricRowCompact: {
      flexDirection: "column",
    },
    metricCard: {
      flex: 1,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.md,
      gap: theme.spacing.xxs,
    },
    metricLabel: {
      fontFamily: fontFamily.bodySemi,
      color: theme.colors.textSecondary,
      fontSize: theme.typeScale.bodySmall,
    },
    metricValue: {
      fontFamily: fontFamily.headingSemi,
      color: theme.colors.textPrimary,
      fontSize: theme.typeScale.h1,
      lineHeight: 34,
    },
    featuredList: {
      gap: theme.spacing.sm,
    },
  });
