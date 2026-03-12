import { Pressable, StyleSheet, Text, View } from "react-native";

import { fontFamily, theme } from "../constants/theme";

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onActionPress?: () => void;
};

export const SectionHeader = ({
  title,
  subtitle,
  actionLabel,
  onActionPress,
}: SectionHeaderProps) => {
  return (
    <View style={styles.wrapper}>
      <View style={styles.left}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {actionLabel && onActionPress ? (
        <Pressable onPress={onActionPress} style={styles.actionButton}>
          <Text style={styles.actionLabel}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.md,
  },
  left: {
    flex: 1,
    gap: theme.spacing.xxs,
  },
  title: {
    fontFamily: fontFamily.headingSemi,
    fontSize: theme.typeScale.h3,
    color: theme.colors.textPrimary,
    lineHeight: 24,
  },
  subtitle: {
    fontFamily: fontFamily.bodyRegular,
    color: theme.colors.textSecondary,
    fontSize: theme.typeScale.bodySmall,
  },
  actionButton: {
    backgroundColor: theme.colors.accentSoft,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.pill,
  },
  actionLabel: {
    fontFamily: fontFamily.bodySemi,
    color: theme.colors.accent,
    fontSize: theme.typeScale.bodySmall,
  },
});
