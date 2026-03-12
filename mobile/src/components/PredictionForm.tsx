import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { fontFamily, theme } from "../constants/theme";
import type {
  CalculatorInput,
  Race,
  RacerProfile,
  Season,
  WeatherCondition,
} from "../types/domain";
import { clamp } from "../utils/format";
import { SectionHeader } from "./SectionHeader";
import { YearChipSelector } from "./YearChipSelector";

type PredictionFormProps = {
  seasons: Season[];
  races: Race[];
  racers: RacerProfile[];
  submitting?: boolean;
  onSubmit: (input: CalculatorInput) => void;
};

const weatherOptions: WeatherCondition[] = ["Dry", "Mixed", "Wet"];

export const PredictionForm = ({
  seasons,
  races,
  racers,
  submitting = false,
  onSubmit,
}: PredictionFormProps) => {
  const [selectedSeason, setSelectedSeason] = useState<number>(seasons[0]?.year ?? 0);
  const [selectedRaceId, setSelectedRaceId] = useState<string>(races[0]?.id ?? "");
  const [selectedRacerId, setSelectedRacerId] = useState<string>(racers[0]?.id ?? "");
  const [gridPosition, setGridPosition] = useState<string>("8");
  const [recentFormScore, setRecentFormScore] = useState<string>("72");
  const [weatherCondition, setWeatherCondition] = useState<WeatherCondition>("Dry");
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  useEffect(() => {
    if (seasons.length && !selectedSeason) {
      setSelectedSeason(seasons[0].year);
    }
  }, [seasons, selectedSeason]);

  const racesForSeason = useMemo(
    () => races.filter((race) => race.season === selectedSeason),
    [races, selectedSeason]
  );

  useEffect(() => {
    if (!racesForSeason.find((race) => race.id === selectedRaceId)) {
      setSelectedRaceId(racesForSeason[0]?.id ?? "");
    }
  }, [racesForSeason, selectedRaceId]);

  useEffect(() => {
    if (!racers.find((racer) => racer.id === selectedRacerId)) {
      setSelectedRacerId(racers[0]?.id ?? "");
    }
  }, [racers, selectedRacerId]);

  const submitForm = () => {
    const parsedGrid = Number(gridPosition);
    const parsedForm = Number(recentFormScore);

    if (!selectedSeason || !selectedRaceId || !selectedRacerId) {
      setValidationMessage("Select season, race, and racer before running the prediction.");
      return;
    }

    if (Number.isNaN(parsedGrid) || parsedGrid < 1 || parsedGrid > 20) {
      setValidationMessage("Grid position must be between 1 and 20.");
      return;
    }

    if (Number.isNaN(parsedForm) || parsedForm < 0 || parsedForm > 100) {
      setValidationMessage("Recent form score must be between 0 and 100.");
      return;
    }

    setValidationMessage(null);

    onSubmit({
      season: selectedSeason,
      raceId: selectedRaceId,
      racerId: selectedRacerId,
      gridPosition: clamp(parsedGrid, 1, 20),
      weatherCondition,
      recentFormScore: clamp(parsedForm, 0, 100),
    });
  };

  return (
    <View style={styles.container}>
      <SectionHeader
        title="Prediction Sandbox"
        subtitle="UI-only calculator wired to mock service responses."
      />

      <View style={styles.block}>
        <Text style={styles.label}>Season</Text>
        <YearChipSelector
          years={seasons.map((season) => season.year)}
          selectedYear={selectedSeason}
          onSelect={setSelectedSeason}
        />
      </View>

      <View style={styles.block}>
        <Text style={styles.label}>Race</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipList}>
          {racesForSeason.map((race) => {
            const selected = race.id === selectedRaceId;
            return (
              <Pressable
                key={race.id}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => setSelectedRaceId(race.id)}
                testID={`race-chip-${race.id}`}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{race.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.block}>
        <Text style={styles.label}>Racer</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipList}>
          {racers.map((racer) => {
            const selected = racer.id === selectedRacerId;
            return (
              <Pressable
                key={racer.id}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => setSelectedRacerId(racer.id)}
                testID={`racer-chip-${racer.id}`}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{racer.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.inputRow}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Grid Position</Text>
          <TextInput
            value={gridPosition}
            onChangeText={setGridPosition}
            keyboardType="number-pad"
            style={styles.input}
            testID="input-grid-position"
            maxLength={2}
            placeholder="1 - 20"
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Recent Form</Text>
          <TextInput
            value={recentFormScore}
            onChangeText={setRecentFormScore}
            keyboardType="number-pad"
            style={styles.input}
            testID="input-form-score"
            maxLength={3}
            placeholder="0 - 100"
          />
        </View>
      </View>

      <View style={styles.block}>
        <Text style={styles.label}>Weather</Text>
        <View style={styles.weatherRow}>
          {weatherOptions.map((option) => {
            const selected = option === weatherCondition;
            return (
              <Pressable
                key={option}
                style={[styles.weatherChip, selected && styles.weatherChipSelected]}
                onPress={() => setWeatherCondition(option)}
                testID={`weather-chip-${option}`}
              >
                <Text style={[styles.weatherText, selected && styles.weatherTextSelected]}>{option}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {validationMessage ? <Text style={styles.validation}>{validationMessage}</Text> : null}

      <Pressable
        style={({ pressed }) => [
          styles.submitButton,
          submitting && styles.submitButtonDisabled,
          pressed && !submitting && styles.submitPressed,
        ]}
        onPress={submitForm}
        disabled={submitting}
        testID="calc-submit-btn"
      >
        <Text style={styles.submitLabel}>{submitting ? "Calculating..." : "Calculate Prediction"}</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
    ...theme.shadows.card,
  },
  block: {
    gap: theme.spacing.xs,
  },
  label: {
    fontFamily: fontFamily.bodySemi,
    color: theme.colors.textPrimary,
    fontSize: theme.typeScale.bodySmall,
  },
  chipList: {
    gap: theme.spacing.xs,
  },
  chip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.surfaceMuted,
  },
  chipSelected: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accentSoft,
  },
  chipText: {
    fontFamily: fontFamily.bodyRegular,
    color: theme.colors.textSecondary,
    fontSize: theme.typeScale.bodySmall,
  },
  chipTextSelected: {
    fontFamily: fontFamily.bodySemi,
    color: theme.colors.accent,
  },
  inputRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  inputGroup: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    fontFamily: fontFamily.bodyRegular,
    fontSize: theme.typeScale.body,
    color: theme.colors.textPrimary,
  },
  weatherRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  weatherChip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.surfaceMuted,
  },
  weatherChipSelected: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accentSoft,
  },
  weatherText: {
    fontFamily: fontFamily.bodyRegular,
    color: theme.colors.textSecondary,
    fontSize: theme.typeScale.bodySmall,
  },
  weatherTextSelected: {
    fontFamily: fontFamily.bodySemi,
    color: theme.colors.accent,
  },
  validation: {
    fontFamily: fontFamily.bodySemi,
    color: theme.colors.error,
    fontSize: theme.typeScale.bodySmall,
  },
  submitButton: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.sm,
    alignItems: "center",
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitPressed: {
    opacity: 0.9,
  },
  submitLabel: {
    fontFamily: fontFamily.bodyBold,
    color: theme.colors.surface,
    fontSize: theme.typeScale.body,
  },
});
