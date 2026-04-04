import { useMemo } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { fontFamily } from "../constants/theme";
import type { AppTheme } from "../constants/theme";
import { useAppTheme } from "../theme/AppThemeProvider";

type LoadingStateProps = {
  label?: string;
};

export const LoadingState = ({ label = "Syncing race telemetry..." }: LoadingStateProps) => {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container} testID="loading-state">
      <ActivityIndicator size="large" color={theme.colors.accent} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      minHeight: 200,
      alignItems: "center",
      justifyContent: "center",
      padding: theme.spacing.lg,
      gap: theme.spacing.sm,
    },
    label: {
      fontFamily: fontFamily.bodySemi,
      color: theme.colors.textSecondary,
      fontSize: theme.typeScale.body,
    },
  });
