import { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import type { AppTheme } from "../constants/theme";
import { useLanguage } from "../i18n/LanguageProvider";
import { useAppTheme } from "../theme/AppThemeProvider";
import { SelectMenu } from "./SelectMenu";

type YearChipSelectorProps = {
  years: number[];
  selectedYear: number;
  onSelect: (year: number) => void;
};

export const YearChipSelector = ({ years, selectedYear, onSelect }: YearChipSelectorProps) => {
  const { theme } = useAppTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const sortedYears = useMemo(
    () => [...years].sort((left, right) => right - left),
    [years]
  );

  const selectYear = (value: string) => {
    const parsedYear = Number(value);
    if (!Number.isFinite(parsedYear)) {
      return;
    }
    onSelect(parsedYear);
  };

  return (
    <View style={styles.container}>
      <SelectMenu
        value={selectedYear ? String(selectedYear) : ""}
        placeholder={t("selectYear")}
        title={t("selectYear")}
        options={sortedYears.map((year) => ({
          label: String(year),
          value: String(year),
          helper: year === selectedYear ? t("currentSelection") : t("commonSeason"),
        }))}
        onChange={selectYear}
        triggerTestID="year-select-trigger"
        optionTestIDPrefix="year-select-option-"
      />
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      width: "100%",
      paddingVertical: theme.spacing.xs,
    },
  });
