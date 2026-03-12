import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { InfoCard } from "../components/InfoCard";
import { LoadingState } from "../components/LoadingState";
import { PredictionForm } from "../components/PredictionForm";
import { ScreenFadeIn } from "../components/ScreenFadeIn";
import { SectionHeader } from "../components/SectionHeader";
import { fontFamily, theme } from "../constants/theme";
import { useAsyncResource } from "../hooks/useAsyncResource";
import { predictionService } from "../services/mockApi";
import type { CalculatorInput, CalculatorResult } from "../types/domain";
import { formatPercent } from "../utils/format";

type PredictionPayload = {
  seasons: Awaited<ReturnType<typeof predictionService.getSeasons>>;
  races: Awaited<ReturnType<typeof predictionService.getAllRaces>>;
  racers: Awaited<ReturnType<typeof predictionService.getRacers>>;
};

export const PredictionScreen = () => {
  const [submitPending, setSubmitPending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<CalculatorResult | null>(null);

  const fetchPayload = useCallback(async (): Promise<PredictionPayload> => {
    const [seasonData, raceData, racerData] = await Promise.all([
      predictionService.getSeasons(),
      predictionService.getAllRaces(),
      predictionService.getRacers(),
    ]);
    return { seasons: seasonData, races: raceData, racers: racerData };
  }, []);

  const resource = useAsyncResource(fetchPayload, {
    isEmpty: (value) => value.seasons.length === 0 || value.races.length === 0 || value.racers.length === 0,
  });

  const handleSubmit = async (input: CalculatorInput) => {
    setSubmitPending(true);
    setSubmitError(null);
    try {
      const response = await predictionService.calculatePrediction(input);
      setResult(response);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Prediction request failed.");
      setResult(null);
    } finally {
      setSubmitPending(false);
    }
  };

  if (resource.status === "loading" || resource.status === "idle") {
    return (
      <View style={styles.stateContainer}>
        <LoadingState label="Booting calculator controls..." />
      </View>
    );
  }

  if (resource.status === "error") {
    return (
      <View style={styles.stateContainer}>
        <ErrorState message={resource.error ?? "Calculator data unavailable."} onRetry={resource.refresh} />
      </View>
    );
  }

  if (resource.status === "empty" || !resource.data) {
    return (
      <View style={styles.stateContainer}>
        <EmptyState
          title="Calculator feed empty"
          message="Seasons, races, or racers are missing in mocked fixtures."
          actionLabel="Reload"
          onAction={resource.refresh}
        />
      </View>
    );
  }

  return (
    <ScreenFadeIn>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <SectionHeader
          title="Prediction Calculator"
          subtitle="UI-only form with mocked model response."
        />
        <PredictionForm
          seasons={resource.data.seasons}
          races={resource.data.races}
          racers={resource.data.racers}
          submitting={submitPending}
          onSubmit={handleSubmit}
        />

        {submitError ? <ErrorState message={submitError} /> : null}

        {result ? (
          <InfoCard title="Mock Prediction Result" value={`${formatPercent(result.predictedTop10Probability)} Top-10`}>
            <Text style={styles.resultMeta}>
              {result.racerName} · Confidence: {result.confidence}
            </Text>
            <View style={styles.reasoningList}>
              {result.reasoning.map((reason, index) => (
                <View key={`${reason}-${index}`} style={styles.reasoningRow}>
                  <View style={styles.reasoningDot} />
                  <Text style={styles.reasoningText}>{reason}</Text>
                </View>
              ))}
            </View>
          </InfoCard>
        ) : (
          <InfoCard title="Result Placeholder">
            <Text style={styles.placeholderText}>
              Submit the form to preview mocked prediction confidence and reasoning cards.
            </Text>
          </InfoCard>
        )}

        <InfoCard title="Future ML Integration Slot">
          <Text style={styles.placeholderText}>
            This panel is reserved for API confidence bands, feature contribution details, and model-version metadata.
          </Text>
        </InfoCard>
      </ScrollView>
    </ScreenFadeIn>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    paddingBottom: 110,
  },
  stateContainer: {
    flex: 1,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
  },
  resultMeta: {
    fontFamily: fontFamily.bodySemi,
    color: theme.colors.textPrimary,
    fontSize: theme.typeScale.body,
  },
  reasoningList: {
    marginTop: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  reasoningRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.xs,
  },
  reasoningDot: {
    marginTop: 7,
    width: 7,
    height: 7,
    borderRadius: 7,
    backgroundColor: theme.colors.accent,
  },
  reasoningText: {
    flex: 1,
    fontFamily: fontFamily.bodyRegular,
    color: theme.colors.textSecondary,
    fontSize: theme.typeScale.body,
    lineHeight: 21,
  },
  placeholderText: {
    fontFamily: fontFamily.bodyRegular,
    color: theme.colors.textSecondary,
    fontSize: theme.typeScale.body,
    lineHeight: 21,
  },
});
