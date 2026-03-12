import { Pressable, StyleSheet, Text, View } from "react-native";

import { fontFamily, theme } from "../constants/theme";

type ErrorStateProps = {
  message: string;
  onRetry?: () => void;
};

export const ErrorState = ({ message, onRetry }: ErrorStateProps) => {
  return (
    <View style={styles.container} testID="error-state">
      <Text style={styles.title}>Pit Wall Alert</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <Pressable style={styles.button} onPress={onRetry}>
          <Text style={styles.buttonText}>Retry</Text>
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: 220,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    padding: theme.spacing.xl,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: "#F6C0B4",
    backgroundColor: "#FFF4F2",
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
