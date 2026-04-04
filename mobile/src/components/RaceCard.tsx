import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { fontFamily } from "../constants/theme";
import type { AppTheme } from "../constants/theme";
import { useAppTheme } from "../theme/AppThemeProvider";
import type { Race } from "../types/domain";
import { formatDate } from "../utils/format";

type RaceCardProps = {
  race: Race;
  onPress: (race: Race) => void;
};

export const RaceCard = ({ race, onPress }: RaceCardProps) => {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => onPress(race)}
      testID={`race-card-${race.id}`}
    >
      <View style={styles.headerRow}>
        <Text style={styles.round}>Round {race.round}</Text>
        <Text style={styles.date}>{formatDate(race.date)}</Text>
      </View>
      <Text style={styles.name}>{race.name}</Text>
      <Text style={styles.circuit}>{race.circuit}</Text>
      <View style={styles.footer}>
        <Text style={styles.country}>{race.country}</Text>
        <View style={styles.weatherChip}>
          <Text style={styles.weatherText}>{race.weatherForecast}</Text>
        </View>
      </View>
    </Pressable>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    card: {
      padding: theme.spacing.md,
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: theme.spacing.xs,
      ...theme.shadows.card,
    },
    cardPressed: {
      transform: [{ scale: 0.985 }],
      opacity: 0.92,
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    round: {
      fontFamily: fontFamily.bodySemi,
      color: theme.colors.accent,
      fontSize: theme.typeScale.bodySmall,
    },
    date: {
      fontFamily: fontFamily.bodyRegular,
      color: theme.colors.textSecondary,
      fontSize: theme.typeScale.bodySmall,
    },
    name: {
      fontFamily: fontFamily.headingSemi,
      fontSize: theme.typeScale.h3,
      color: theme.colors.textPrimary,
    },
    circuit: {
      fontFamily: fontFamily.bodyRegular,
      fontSize: theme.typeScale.body,
      color: theme.colors.textSecondary,
    },
    footer: {
      marginTop: theme.spacing.xs,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    country: {
      fontFamily: fontFamily.bodySemi,
      color: theme.colors.textPrimary,
      fontSize: theme.typeScale.bodySmall,
    },
    weatherChip: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xxs,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.surfaceMuted,
    },
    weatherText: {
      fontFamily: fontFamily.bodySemi,
      color: theme.colors.textSecondary,
      fontSize: theme.typeScale.caption,
    },
  });
