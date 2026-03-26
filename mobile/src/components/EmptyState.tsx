import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { fontFamily } from "../constants/theme";
import type { AppTheme } from "../constants/theme";
import { useAppTheme } from "../theme/AppThemeProvider";

type EmptyStateProps = {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

export const EmptyState = ({ title, message, actionLabel, onAction }: EmptyStateProps) => {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container} testID="empty-state">
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable style={styles.actionButton} onPress={onAction}>
          <Text style={styles.actionText}>{actionLabel}</Text>
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
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    title: {
      fontFamily: fontFamily.headingSemi,
      fontSize: theme.typeScale.h3,
      color: theme.colors.textPrimary,
    },
    message: {
      fontFamily: fontFamily.bodyRegular,
      fontSize: theme.typeScale.body,
      color: theme.colors.textSecondary,
      textAlign: "center",
      lineHeight: 22,
    },
    actionButton: {
      marginTop: theme.spacing.sm,
      backgroundColor: theme.colors.accentSoft,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radius.pill,
    },
    actionText: {
      fontFamily: fontFamily.bodySemi,
      color: theme.colors.accent,
      fontSize: theme.typeScale.body,
    },
  });
