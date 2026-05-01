import { useCallback } from "react";

import { useAsyncResource } from "../hooks/useAsyncResource";
import { useLanguage } from "../i18n/LanguageProvider";
import { predictionService } from "../services/predictionService";
import type { RacerDetailsParams } from "../types/navigation";

type RacerDetailPayload = {
  racerDetails: Awaited<ReturnType<typeof predictionService.getRacerDetails>>;
  raceDetails: Awaited<ReturnType<typeof predictionService.getRaceDetails>>;
};

export const useRacerDetailsController = (routeParams: RacerDetailsParams) => {
  const { language, t } = useLanguage();
  const { racerId, raceId } = routeParams;

  const fetchPayload = useCallback(async (): Promise<RacerDetailPayload> => {
    const [racerDetails, raceDetails] = await Promise.all([
      predictionService.getRacerDetails(racerId, raceId),
      predictionService.getRaceDetails(raceId),
    ]);

    return { racerDetails, raceDetails };
  }, [racerId, raceId]);

  const resource = useAsyncResource(fetchPayload, {
    dependencies: [racerId, raceId],
  });

  const raceContext = resource.data?.racerDetails.raceContext;
  const teamMomentum = Number(raceContext?.constructorMomentum ?? 0);
  const momentumLabel =
    teamMomentum >= 70 ? t("racerStrong") : teamMomentum >= 45 ? t("racerCompetitive") : t("racerLow");
  const circuitSignal =
    (raceContext?.avgFinishAtCircuit ?? 0) <= 8
      ? t("racerPositive")
      : (raceContext?.avgFinishAtCircuit ?? 0) <= 14
        ? t("racerNeutral")
        : t("racerRisk");
  const lastFinishSignal =
    (raceContext?.lastFinish ?? 0) <= 10 ? t("racerRecentPoints") : t("racerRecentNonPoints");

  const insights =
    raceContext === undefined
      ? null
      : {
          momentumLabel,
          lastFinishInsight:
            language === "bg"
              ? `${t("racerLastFinish")} показва ${lastFinishSignal}, което дава контекст за скорошната база на пилота.`
              : `Last finish indicates ${lastFinishSignal}, which helps contextualize the driver's recent baseline.`,
          circuitInsight:
            language === "bg"
              ? `Историята на пистата е ${circuitSignal} сигнал със средно класиране P${raceContext.avgFinishAtCircuit}.`
              : `Circuit history is a ${circuitSignal} signal with an average finish of P${raceContext.avgFinishAtCircuit}.`,
          constructorInsight:
            language === "bg"
              ? `Формата на отбора е ${raceContext.constructorMomentum}% и участва като контекст около прогнозния поток.`
              : `Constructor momentum is ${raceContext.constructorMomentum}%, reflecting team-level form used around the prediction flow.`,
        };

  return {
    resource,
    insights,
  };
};
