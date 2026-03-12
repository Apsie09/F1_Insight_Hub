import { Pressable, StyleSheet, Text, View } from "react-native";

import { fontFamily, theme } from "../constants/theme";
import type { Top10PredictionEntry } from "../types/domain";
import { formatPercent } from "../utils/format";

type RacerRowCardProps = {
  entry: Top10PredictionEntry;
  onPress: (entry: Top10PredictionEntry) => void;
};

const trendToColor: Record<Top10PredictionEntry["formTrend"], string> = {
  Rising: theme.colors.success,
  Stable: theme.colors.textSecondary,
  Falling: theme.colors.warning,
};

export const RacerRowCard = ({ entry, onPress }: RacerRowCardProps) => {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => onPress(entry)}
      testID={`racer-row-${entry.rank}`}
    >
      <View style={styles.rankPill}>
        <Text style={styles.rankText}>{entry.rank}</Text>
      </View>
      <View style={styles.identity}>
        <Text style={styles.name}>{entry.racerName}</Text>
        <Text style={styles.team}>{entry.team}</Text>
      </View>
      <View style={styles.metrics}>
        <Text style={styles.probability}>{formatPercent(entry.top10Probability)}</Text>
        <Text style={[styles.formTrend, { color: trendToColor[entry.formTrend] }]}>
          {entry.formTrend}
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  rowPressed: {
    opacity: 0.88,
  },
  rankPill: {
    width: 34,
    height: 34,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: {
    fontFamily: fontFamily.headingSemi,
    color: theme.colors.accent,
    fontSize: theme.typeScale.h3,
    lineHeight: 26,
  },
  identity: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontFamily: fontFamily.bodyBold,
    color: theme.colors.textPrimary,
    fontSize: theme.typeScale.body,
  },
  team: {
    fontFamily: fontFamily.bodyRegular,
    color: theme.colors.textSecondary,
    fontSize: theme.typeScale.bodySmall,
  },
  metrics: {
    alignItems: "flex-end",
    gap: 2,
  },
  probability: {
    fontFamily: fontFamily.bodyBold,
    color: theme.colors.textPrimary,
    fontSize: theme.typeScale.body,
  },
  formTrend: {
    fontFamily: fontFamily.bodySemi,
    fontSize: theme.typeScale.caption,
  },
});
