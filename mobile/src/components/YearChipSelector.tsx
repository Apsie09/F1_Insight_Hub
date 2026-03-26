import { useMemo } from "react";
import { ScrollView, Pressable, StyleSheet, Text } from "react-native";

import { fontFamily } from "../constants/theme";
import type { AppTheme } from "../constants/theme";
import { useAppTheme } from "../theme/AppThemeProvider";

type YearChipSelectorProps = {
  years: number[];
  selectedYear: number;
  onSelect: (year: number) => void;
};

export const YearChipSelector = ({ years, selectedYear, onSelect }: YearChipSelectorProps) => {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <ScrollView
      style={styles.scroll}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {years.map((year) => {
        const selected = year === selectedYear;
        return (
          <Pressable
            key={year}
            style={({ pressed }) => [
              styles.chip,
              selected && styles.selectedChip,
              pressed && styles.pressedChip,
            ]}
            onPress={() => onSelect(year)}
            testID={`year-chip-${year}`}
          >
            <Text style={[styles.label, selected && styles.selectedLabel]}>{year}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    scroll: {
      flexGrow: 0,
      minHeight: 56,
    },
    container: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.xs,
      paddingRight: theme.spacing.md,
    },
    chip: {
      flexGrow: 0,
      flexShrink: 0,
      alignSelf: "flex-start",
      minWidth: 68,
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
    },
    selectedChip: {
      backgroundColor: theme.colors.accent,
      borderColor: theme.colors.accent,
    },
    pressedChip: {
      opacity: 0.82,
    },
    label: {
      fontFamily: fontFamily.bodySemi,
      color: theme.colors.textSecondary,
      fontSize: theme.typeScale.body,
    },
    selectedLabel: {
      color: theme.colors.surface,
    },
  });
