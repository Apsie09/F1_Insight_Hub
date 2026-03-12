import { ScrollView, Pressable, StyleSheet, Text } from "react-native";

import { fontFamily, theme } from "../constants/theme";

type YearChipSelectorProps = {
  years: number[];
  selectedYear: number;
  onSelect: (year: number) => void;
};

export const YearChipSelector = ({ years, selectedYear, onSelect }: YearChipSelectorProps) => {
  return (
    <ScrollView
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

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.xs,
  },
  chip: {
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
