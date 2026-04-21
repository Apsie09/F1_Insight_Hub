import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { fontFamily } from "../constants/theme";
import type { AppTheme } from "../constants/theme";
import { useLanguage } from "../i18n/LanguageProvider";
import { useAppTheme } from "../theme/AppThemeProvider";

type ErrorStateProps = {
  message: string;
  onRetry?: () => void;
};

export const ErrorState = ({ message, onRetry }: ErrorStateProps) => {
  const { theme } = useAppTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container} testID="error-state">
      <Text style={styles.title}>{t("errorTitle")}</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <Pressable style={styles.button} onPress={onRetry}>
          <Text style={styles.buttonText}>{t("commonRetry")}</Text>
        </Pressable>
      ) : null}
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      minHeight: 220,
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.sm,
      padding: theme.spacing.xl,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.errorBorder,
      backgroundColor: theme.colors.errorSurface,
    },
    title: {
      fontFamily: fontFamily.headingSemi,
      color: theme.colors.error,
      fontSize: theme.typeScale.h3,
    },
    message: {
      fontFamily: fontFamily.bodyRegular,
      color: theme.colors.textSecondary,
      textAlign: "center",
      fontSize: theme.typeScale.body,
    },
    button: {
      marginTop: theme.spacing.sm,
      backgroundColor: theme.colors.error,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radius.pill,
    },
    buttonText: {
      fontFamily: fontFamily.bodySemi,
      color: theme.colors.surface,
      fontSize: theme.typeScale.body,
    },
  });
