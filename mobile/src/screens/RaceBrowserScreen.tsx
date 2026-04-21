import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { RaceCard } from "../components/RaceCard";
import { SectionHeader } from "../components/SectionHeader";
import { YearChipSelector } from "../components/YearChipSelector";
import { APP_TAB_BAR_HEIGHT } from "../constants/layout";
import type { AppTheme } from "../constants/theme";
import { useAsyncResource } from "../hooks/useAsyncResource";
import { useLanguage } from "../i18n/LanguageProvider";
import { predictionService } from "../services/predictionService";
import { useAppTheme } from "../theme/AppThemeProvider";
import type { BrowseStackParamList } from "../types/navigation";

type RaceBrowserScreenProps = NativeStackScreenProps<BrowseStackParamList, "RaceBrowser">;

export const RaceBrowserScreen = ({ navigation }: RaceBrowserScreenProps) => {
  const { theme } = useAppTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [selectedYear, setSelectedYear] = useState<number>(0);
  const tabBarHeight = APP_TAB_BAR_HEIGHT;
  const insets = useSafeAreaInsets();

  const contentInsets = useMemo(
    () => ({
      paddingLeft: theme.spacing.md + insets.left,
      paddingRight: theme.spacing.md + insets.right,
    }),
    [insets.left, insets.right]
  );

  const listInsets = useMemo(
    () => ({
      paddingBottom: tabBarHeight + insets.bottom + theme.spacing.lg,
    }),
    [insets.bottom, tabBarHeight]
  );

  const fetchSeasons = useCallback(() => predictionService.getSeasons(), []);
  const seasonsResource = useAsyncResource(fetchSeasons, {
    isEmpty: (value) => value.length === 0,
  });

  useEffect(() => {
    if (!selectedYear && seasonsResource.data?.length) {
      setSelectedYear(seasonsResource.data[0].year);
    }
  }, [selectedYear, seasonsResource.data]);

  const fetchRaces = useCallback(() => {
    if (!selectedYear) {
      return Promise.resolve([]);
    }
    return predictionService.getRacesBySeason(selectedYear);
  }, [selectedYear]);

  const racesResource = useAsyncResource(fetchRaces, {
    immediate: Boolean(selectedYear),
    dependencies: [selectedYear],
    isEmpty: (value) => value.length === 0,
  });

  const title = useMemo(() => {
    if (!selectedYear) {
      return t("browseDefaultTitle");
    }

    return `${selectedYear} ${t("browseCalendarSuffix")}`;
  }, [selectedYear, t]);

  const renderBody = () => {
    if (seasonsResource.status === "loading" || seasonsResource.status === "idle") {
      return <LoadingState label={t("browseLoadingSeasons")} />;
    }

    if (seasonsResource.status === "error") {
      return (
        <ErrorState
          message={seasonsResource.error ?? t("browseLoadError")}
          onRetry={seasonsResource.refresh}
        />
      );
    }

    if (seasonsResource.status === "empty" || !seasonsResource.data) {
      return (
        <EmptyState
          title={t("browseEmptyTitle")}
          message={t("browseEmptyMessage")}
          actionLabel={t("commonRetry")}
          onAction={seasonsResource.refresh}
        />
      );
    }

    return (
      <FlatList
        style={styles.raceList}
        data={racesResource.status === "success" && racesResource.data ? racesResource.data : []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, contentInsets, listInsets]}
        ListHeaderComponent={
          <>
            <SectionHeader title={t("browseHeaderTitle")} subtitle={t("browseHeaderSubtitle")} />
            <View style={styles.yearSelectorBlock}>
              <YearChipSelector
                years={seasonsResource.data.map((season) => season.year)}
                selectedYear={selectedYear}
                onSelect={setSelectedYear}
              />
            </View>

            <SectionHeader title={title} subtitle={t("browseRaceSubtitle")} />
            {racesResource.status === "loading" || racesResource.status === "idle" ? (
              <LoadingState label={t("browseLoadingRaces")} />
            ) : null}
            {racesResource.status === "error" ? (
              <ErrorState message={racesResource.error ?? t("browseRaceError")} onRetry={racesResource.refresh} />
            ) : null}
            {racesResource.status === "empty" ? (
              <EmptyState
                title={t("browseNoRacesTitle")}
                message={t("browseNoRacesMessage")}
                actionLabel={t("commonReload")}
                onAction={racesResource.refresh}
              />
            ) : null}
          </>
        }
        renderItem={({ item }) => (
          <RaceCard
            race={item}
            onPress={(race) =>
              navigation.navigate("RaceDetails", {
                raceId: race.id,
                season: race.season,
              })
            }
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: theme.spacing.sm }} />}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return <View style={styles.container}>{renderBody()}</View>;
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      paddingTop: theme.spacing.md,
      gap: theme.spacing.md,
    },
    yearSelectorBlock: {
      zIndex: 2,
      marginBottom: theme.spacing.xs,
    },
    raceList: {
      flex: 1,
    },
    listContent: {
      paddingTop: theme.spacing.md,
    },
  });
