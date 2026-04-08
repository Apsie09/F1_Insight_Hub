import { useMemo, useSyncExternalStore } from "react";
import { StyleSheet, Text, View } from "react-native";

import { fontFamily } from "../constants/theme";
import type { AppTheme } from "../constants/theme";
import {
  getPredictionDataSourceSnapshot,
  subscribePredictionDataSource,
} from "../services/predictionService";
import { useAppTheme } from "../theme/AppThemeProvider";

const labelByMode = {
  api: "API",
  mock: "MOCK",
  mixed: "MIXED",
} as const;

export const DataSourceBadge = () => {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const snapshot = useSyncExternalStore(
    subscribePredictionDataSource,
    getPredictionDataSourceSnapshot,
    getPredictionDataSourceSnapshot
  );

  const tone = useMemo(() => {
    switch (snapshot.mode) {
      case "api":
        return {
          border: theme.colors.success,
          background: theme.colors.surfaceMuted,
          dot: theme.colors.success,
          text: theme.colors.textPrimary,
        };
      case "mock":
        return {
          border: theme.colors.warning,
          background: theme.colors.surfaceMuted,
          dot: theme.colors.warning,
          text: theme.colors.textPrimary,
        };
      default:
        return {
          border: theme.colors.accent,
          background: theme.colors.accentSoft,
          dot: theme.colors.accent,
          text: theme.colors.textPrimary,
        };
    }
  }, [snapshot.mode, theme.colors]);

  return (
    <View
      style={[
        styles.badge,
        {
          borderColor: tone.border,
          backgroundColor: tone.background,
        },
      ]}
      testID="header-data-source-badge"
      accessibilityLabel={`Data source ${labelByMode[snapshot.mode]}`}
    >
      <View style={[styles.dot, { backgroundColor: tone.dot }]} />
      <Text style={[styles.label, { color: tone.text }]}>{labelByMode[snapshot.mode]}</Text>
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    badge: {
      minHeight: 28,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      paddingHorizontal: theme.spacing.xs,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 8,
    },
    label: {
      fontFamily: fontFamily.bodySemi,
      fontSize: theme.typeScale.caption,
    },
  });

