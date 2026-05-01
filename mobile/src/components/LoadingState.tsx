import { useMemo } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { fontFamily } from "../constants/theme";
import type { AppTheme } from "../constants/theme";
import { useLanguage } from "../i18n/LanguageProvider";
import { useAppTheme } from "../theme/AppThemeProvider";

type LoadingStateProps = {
  label?: string;
};

export const LoadingState = ({ label }: LoadingStateProps) => {
  const { theme } = useAppTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container} testID="loading-state">
      <ActivityIndicator size="large" color={theme.colors.accent} />
      <Text style={styles.label}>{label ?? t("loadingDefault")}</Text>
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
