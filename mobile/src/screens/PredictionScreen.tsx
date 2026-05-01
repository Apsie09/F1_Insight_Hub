import { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { InfoCard } from "../components/InfoCard";
import { LoadingState } from "../components/LoadingState";
import { PredictionForm } from "../components/PredictionForm";
import { SectionHeader } from "../components/SectionHeader";
import { APP_TAB_BAR_HEIGHT } from "../constants/layout";
import { fontFamily } from "../constants/theme";
import type { AppTheme } from "../constants/theme";
import { MODEL_PRESENTATION_DELAY_MS, usePredictionController } from "../controllers/usePredictionController";
import { useLanguage } from "../i18n/LanguageProvider";
import { useAppTheme } from "../theme/AppThemeProvider";
import { formatPercent } from "../utils/format";

const loadingTire = require("../../assets/loading_tire.png");

const PredictionLoadingCard = () => {
  const { theme } = useAppTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spinAnimation = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 700,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    const progressAnimation = Animated.timing(progress, {
      toValue: 1,
      duration: MODEL_PRESENTATION_DELAY_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });

    spinAnimation.start();
    pulseAnimation.start();
    progress.setValue(0);
    progressAnimation.start();

    return () => {
      spinAnimation.stop();
      pulseAnimation.stop();
      progressAnimation.stop();
    };
  }, [progress, pulse, spin]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });
  const scale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });
  const opacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.72, 1],
  });
  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["8%", "100%"],
  });

  return (
    <InfoCard title={t("calcModelRunning")} value={t("calcCalculating")}>
      <View style={styles.loadingContent}>
        <View style={styles.loadingTireFrame}>
          <Animated.Image
            source={loadingTire}
            resizeMode="contain"
            style={[styles.loadingTire, { transform: [{ rotate }, { scale }], opacity }]}
          />
        </View>
        <View style={styles.loadingCopy}>
          <Text style={styles.loadingTitle}>{t("calcRunningTitle")}</Text>
          <Text style={styles.loadingText}>{t("calcRunningText")}</Text>
          <View style={styles.loadingProgressTrack}>
            <Animated.View style={[styles.loadingProgressFill, { width: progressWidth }]} />
          </View>
        </View>
      </View>
    </InfoCard>
  );
};

export const PredictionScreen = () => {
  const { theme } = useAppTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const {
    resource,
    submitPending,
    submitError,
    result,
    availableRacers,
    racersLoading,
    racerLoadError,
    handleSubmit,
    handleRaceChange,
  } = usePredictionController();
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
        <LoadingState label={t("calcBooting")} />
      </View>
    );
  }

  if (resource.status === "error") {
    return (
      <View style={[styles.stateContainer, contentInsets]}>
        <ErrorState message={resource.error ?? t("calcDataUnavailable")} onRetry={resource.refresh} />
      </View>
    );
  }

  if (resource.status === "empty" || !resource.data) {
    return (
      <View style={[styles.stateContainer, contentInsets]}>
        <EmptyState
          title={t("calcEmptyTitle")}
          message={t("calcEmptyMessage")}
          actionLabel={t("commonReload")}
          onAction={resource.refresh}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={8}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, contentInsets]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      >
        <SectionHeader
          title={t("calcTitle")}
          subtitle={t("calcSubtitle")}
        />
        <PredictionForm
          seasons={resource.data.seasons}
          races={resource.data.races}
          availableRacers={availableRacers}
          racersLoading={racersLoading}
          racerLoadError={racerLoadError}
          submitting={submitPending}
          onRaceChange={handleRaceChange}
          onSubmit={handleSubmit}
        />

        {submitError ? <ErrorState message={submitError} /> : null}

        {submitPending ? <PredictionLoadingCard /> : null}

        {!submitPending && result ? (
          <InfoCard title={t("calcResultTitle")} value={`${formatPercent(result.predictedTop10Probability)} Top-10`}>
            {result.predictionSupport === "historical_estimate" && result.supportMessage ? (
              <View
                style={[
                  styles.supportBanner,
                  styles.supportBannerHistorical,
                ]}
              >
                <Text style={styles.supportTitle}>
                  {t("calcHistoricalEstimate")}
                </Text>
                <Text style={styles.supportText}>{result.supportMessage}</Text>
              </View>
            ) : null}
            <Text style={styles.resultMeta}>
              {result.racerName} - {t("commonConfidence")}: {result.confidence}
            </Text>
            <View style={styles.reasoningList}>
              {result.reasoning.map((reason, index) => (
                <View key={`${reason}-${index}`} style={styles.reasoningRow}>
                  <View style={styles.reasoningDot} />
                  <Text style={styles.reasoningText}>{reason}</Text>
                </View>
              ))}
            </View>
          </InfoCard>
        ) : null}

        {!submitPending && !result ? (
          <InfoCard title={t("calcResultPlaceholder")}>
            <Text style={styles.placeholderText}>
              {t("calcResultPlaceholderText")}
            </Text>
          </InfoCard>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    keyboardContainer: {
      flex: 1,
    },
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
    resultMeta: {
      fontFamily: fontFamily.bodySemi,
      color: theme.colors.textPrimary,
      fontSize: theme.typeScale.body,
    },
    supportBanner: {
      marginBottom: theme.spacing.sm,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceMuted,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
      gap: theme.spacing.xs,
    },
    supportBannerHistorical: {
      borderColor: theme.colors.warning,
    },
    supportTitle: {
      fontFamily: fontFamily.bodyBold,
      color: theme.colors.textPrimary,
      fontSize: theme.typeScale.bodySmall,
    },
    supportText: {
      fontFamily: fontFamily.bodyRegular,
      color: theme.colors.textSecondary,
      fontSize: theme.typeScale.bodySmall,
      lineHeight: 20,
    },
    reasoningList: {
      marginTop: theme.spacing.sm,
      gap: theme.spacing.xs,
    },
    reasoningRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: theme.spacing.xs,
    },
    reasoningDot: {
      marginTop: 7,
      width: 7,
      height: 7,
      borderRadius: 7,
      backgroundColor: theme.colors.accent,
    },
    reasoningText: {
      flex: 1,
      fontFamily: fontFamily.bodyRegular,
      color: theme.colors.textSecondary,
      fontSize: theme.typeScale.body,
      lineHeight: 21,
    },
    placeholderText: {
      fontFamily: fontFamily.bodyRegular,
      color: theme.colors.textSecondary,
      fontSize: theme.typeScale.body,
      lineHeight: 21,
    },
    loadingContent: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.md,
    },
    loadingTireFrame: {
      width: 74,
      height: 74,
      borderRadius: 74,
      backgroundColor: theme.colors.surfaceMuted,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    loadingTire: {
      width: 72,
      height: 72,
    },
    loadingCopy: {
      flex: 1,
      gap: theme.spacing.xs,
    },
    loadingTitle: {
      fontFamily: fontFamily.bodyBold,
      color: theme.colors.textPrimary,
      fontSize: theme.typeScale.body,
    },
    loadingText: {
      fontFamily: fontFamily.bodyRegular,
      color: theme.colors.textSecondary,
      fontSize: theme.typeScale.bodySmall,
      lineHeight: 20,
    },
    loadingProgressTrack: {
      height: 8,
      borderRadius: 8,
      backgroundColor: theme.colors.surfaceMuted,
      overflow: "hidden",
      marginTop: theme.spacing.xs,
    },
    loadingProgressFill: {
      height: "100%",
      borderRadius: 8,
      backgroundColor: theme.colors.accent,
    },
  });
