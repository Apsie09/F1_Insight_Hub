import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { fontFamily, theme } from "../constants/theme";

type InfoCardProps = {
  title: string;
  value?: string;
  children?: ReactNode;
};

export const InfoCard = ({ title, value, children }: InfoCardProps) => {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {value ? <Text style={styles.value}>{value}</Text> : null}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
    ...theme.shadows.card,
  },
  title: {
    fontFamily: fontFamily.bodySemi,
    color: theme.colors.textSecondary,
    fontSize: theme.typeScale.bodySmall,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  value: {
    fontFamily: fontFamily.headingSemi,
    color: theme.colors.textPrimary,
    fontSize: theme.typeScale.h3,
  },
});
