import { StyleSheet, Text, View } from "react-native";

import { fontFamily, theme } from "../constants/theme";

type StatCardProps = {
  label: string;
  value: string | number;
  helper?: string;
};

export const StatCard = ({ label, value, helper }: StatCardProps) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      {helper ? <Text style={styles.helper}>{helper}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: 100,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.sm,
    gap: theme.spacing.xxs,
  },
  label: {
    fontFamily: fontFamily.bodySemi,
    color: theme.colors.textSecondary,
    fontSize: theme.typeScale.caption,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  value: {
    fontFamily: fontFamily.headingSemi,
    color: theme.colors.textPrimary,
    fontSize: theme.typeScale.h3,
  },
  helper: {
    fontFamily: fontFamily.bodyRegular,
    color: theme.colors.textSecondary,
    fontSize: theme.typeScale.caption,
  },
});
