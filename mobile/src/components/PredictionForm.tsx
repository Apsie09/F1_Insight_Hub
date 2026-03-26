import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";

import { fontFamily } from "../constants/theme";
import type { AppTheme } from "../constants/theme";
import { useAppTheme } from "../theme/AppThemeProvider";
import type {
  CalculatorInput,
  Race,
  RacerProfile,
  Season,
  WeatherCondition,
} from "../types/domain";
import { clamp } from "../utils/format";
import { SelectMenu } from "./SelectMenu";
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
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { width } = useWindowDimensions();
  const isCompactWidth = width < 380;
  const [selectedSeason, setSelectedSeason] = useState<number>(seasons[0]?.year ?? 0);
  const [selectedRaceId, setSelectedRaceId] = useState<string>("");
  const [selectedRacerId, setSelectedRacerId] = useState<string>("");
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
    if (selectedRaceId && !racesForSeason.find((race) => race.id === selectedRaceId)) {
      setSelectedRaceId("");
    }
  }, [racesForSeason, selectedRaceId]);

  useEffect(() => {
    if (selectedRacerId && !racers.find((racer) => racer.id === selectedRacerId)) {
      setSelectedRacerId("");
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
        <SelectMenu
          value={selectedRaceId}
          placeholder="Select race"
          title="Select race"
          options={racesForSeason.map((race) => ({
            label: `R${race.round} - ${race.name}`,
            value: race.id,
            helper: `${race.country} - ${race.circuit}`,
          }))}
          onChange={setSelectedRaceId}
          triggerTestID="race-select-trigger"
          optionTestIDPrefix="race-select-option-"
        />
      </View>

      <View style={styles.block}>
        <Text style={styles.label}>Racer</Text>
        <SelectMenu
          value={selectedRacerId}
          placeholder="Select racer"
          title="Select racer"
          options={racers.map((racer) => ({
            label: racer.name,
            value: racer.id,
            helper: racer.team,
          }))}
          onChange={setSelectedRacerId}
          triggerTestID="racer-select-trigger"
          optionTestIDPrefix="racer-select-option-"
        />
      </View>

      <View style={[styles.inputRow, isCompactWidth && styles.inputRowCompact]}>
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
            placeholderTextColor={theme.colors.textSecondary}
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
            placeholderTextColor={theme.colors.textSecondary}
          />
        </View>
      </View>

      <View style={styles.block}>
        <Text style={styles.label}>Weather</Text>
        <View style={[styles.weatherRow, isCompactWidth && styles.weatherRowCompact]}>
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

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
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
    inputRow: {
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    inputRowCompact: {
      flexDirection: "column",
    },
    inputGroup: {
      flex: 1,
      gap: theme.spacing.xs,
    },
    input: {
      minHeight: 44,
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
      flexWrap: "wrap",
      gap: theme.spacing.sm,
    },
    weatherRowCompact: {
      gap: theme.spacing.xs,
    },
    weatherChip: {
      minHeight: 44,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.pill,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      backgroundColor: theme.colors.surfaceMuted,
      alignItems: "center",
      justifyContent: "center",
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
