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
  availableRacers: RacerProfile[];
  racersLoading?: boolean;
  racerLoadError?: string | null;
  submitting?: boolean;
  onRaceChange?: (raceId: string) => void;
  onSubmit: (input: CalculatorInput) => void;
};

const weatherOptions: WeatherCondition[] = ["Dry", "Mixed", "Wet"];

export const PredictionForm = ({
  seasons,
  races,
  availableRacers,
  racersLoading = false,
  racerLoadError = null,
  submitting = false,
  onRaceChange,
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
  const [weatherCondition, setWeatherCondition] = useState<WeatherCondition>("Dry");
  const [racerSearch, setRacerSearch] = useState<string>("");
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
  const selectedSeasonMeta = useMemo(
    () => seasons.find((season) => season.year === selectedSeason),
    [seasons, selectedSeason]
  );
  const selectedRace = useMemo(
    () => racesForSeason.find((race) => race.id === selectedRaceId),
    [racesForSeason, selectedRaceId]
  );
  const supportMessage =
    selectedRace?.predictionSupport === "historical_estimate"
      ? selectedRace.supportMessage
      : selectedSeasonMeta?.predictionSupport === "historical_estimate"
        ? selectedSeasonMeta.supportMessage
        : null;

  useEffect(() => {
    if (selectedRaceId && !racesForSeason.find((race) => race.id === selectedRaceId)) {
      setSelectedRaceId("");
    }
  }, [racesForSeason, selectedRaceId]);

  useEffect(() => {
    if (selectedRacerId && !availableRacers.find((racer) => racer.id === selectedRacerId)) {
      setSelectedRacerId("");
    }
  }, [availableRacers, selectedRacerId]);

  const filteredRacers = useMemo(() => {
    const needle = racerSearch.trim().toLowerCase();
    if (!needle) {
      return availableRacers;
    }

    return availableRacers.filter((racer) => {
      const haystack = `${racer.name} ${racer.team}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [availableRacers, racerSearch]);
  const selectedRacer = useMemo(
    () => availableRacers.find((racer) => racer.id === selectedRacerId) ?? null,
    [availableRacers, selectedRacerId]
  );

  const submitForm = () => {
    const parsedGrid = Number(gridPosition);

    if (!selectedSeason || !selectedRaceId || !selectedRacerId) {
      setValidationMessage("Select season, race, and racer before running the prediction.");
      return;
    }

    if (Number.isNaN(parsedGrid) || parsedGrid < 1 || parsedGrid > 20) {
      setValidationMessage("Grid position must be between 1 and 20.");
      return;
    }

    setValidationMessage(null);

    onSubmit({
      season: selectedSeason,
      raceId: selectedRaceId,
      racerId: selectedRacerId,
      gridPosition: clamp(parsedGrid, 1, 20),
      weatherCondition,
    });
  };

  return (
    <View style={styles.container}>
      <SectionHeader
        title="Prediction Sandbox"
        subtitle="Interactive calculator wired to the backend prediction service."
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
          onChange={(nextRaceId) => {
            setSelectedRaceId(nextRaceId);
            setSelectedRacerId("");
            setRacerSearch("");
            onRaceChange?.(nextRaceId);
          }}
          triggerTestID="race-select-trigger"
          optionTestIDPrefix="race-select-option-"
        />
      </View>

      {supportMessage ? (
        <View style={styles.supportBanner}>
          <Text style={styles.supportTitle}>Historical estimate</Text>
          <Text style={styles.supportText}>{supportMessage}</Text>
        </View>
      ) : null}

      <View style={styles.block}>
        <Text style={styles.label}>Racer</Text>
        <TextInput
          value={racerSearch}
          onChangeText={setRacerSearch}
          style={styles.input}
          placeholder={selectedRaceId ? "Type racer name or team" : "Select race first"}
          placeholderTextColor={theme.colors.textSecondary}
          editable={Boolean(selectedRaceId) && !racersLoading}
          testID="input-racer-search"
        />
        <SelectMenu
          value={selectedRacerId}
          placeholder="Select racer"
          title="Select racer"
          options={filteredRacers.map((racer) => ({
            label: racer.name,
            value: racer.id,
            helper: racer.team,
          }))}
          onChange={setSelectedRacerId}
          triggerTestID="racer-select-trigger"
          optionTestIDPrefix="racer-select-option-"
        />
        {racersLoading ? <Text style={styles.helperText}>Loading race-specific racers...</Text> : null}
        {!racersLoading && racerLoadError ? <Text style={styles.validation}>{racerLoadError}</Text> : null}
        {!racersLoading && !racerLoadError && selectedRaceId && filteredRacers.length === 0 ? (
          <Text style={styles.helperText}>No racers found for this race/filter combination.</Text>
        ) : null}
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
          <View style={styles.derivedValueCard}>
            <Text style={styles.derivedValueText}>
              {selectedRacer?.recentFormScore ?? "--"}
            </Text>
            <Text style={styles.derivedValueHint}>
              Derived from recent rolling points and Top-10 history.
            </Text>
          </View>
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
    derivedValueCard: {
      minHeight: 44,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surfaceMuted,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      justifyContent: "center",
      gap: theme.spacing.xs,
    },
    derivedValueText: {
      fontFamily: fontFamily.bodyBold,
      color: theme.colors.textPrimary,
      fontSize: theme.typeScale.body,
    },
    derivedValueHint: {
      fontFamily: fontFamily.bodyRegular,
      color: theme.colors.textSecondary,
      fontSize: theme.typeScale.caption,
      lineHeight: 18,
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
    helperText: {
      fontFamily: fontFamily.bodyRegular,
      color: theme.colors.textSecondary,
      fontSize: theme.typeScale.bodySmall,
    },
    supportBanner: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surfaceMuted,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
      gap: theme.spacing.xs,
    },
    supportTitle: {
      fontFamily: fontFamily.bodyBold,
      color: theme.colors.textPrimary,
      fontSize: theme.typeScale.bodySmall,
    },
    supportText: {
      fontFamily: fontFamily.bodyRegular,
      color: theme.colors.textSecondary,
      fontSize: theme.typeScale.bodySmall,
      lineHeight: 20,
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
