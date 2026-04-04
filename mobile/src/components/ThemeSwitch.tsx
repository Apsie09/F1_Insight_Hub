import { useMemo } from "react";
import { StyleSheet, Switch, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { AppTheme } from "../constants/theme";
import { useAppTheme } from "../theme/AppThemeProvider";

export const ThemeSwitch = () => {
  const { isDark, toggleTheme, theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <Ionicons
        name={isDark ? "moon" : "sunny"}
        size={16}
        color={isDark ? theme.colors.accent : theme.colors.textSecondary}
      />
      <Switch
        value={isDark}
        onValueChange={toggleTheme}
        trackColor={{
          false: theme.colors.surfaceMuted,
          true: theme.colors.accentSoft,
        }}
        thumbColor={isDark ? theme.colors.accent : theme.colors.surface}
        ios_backgroundColor={theme.colors.surfaceMuted}
        testID="theme-toggle-switch"
        accessibilityLabel="Dark theme switch"
        accessibilityRole="switch"
      />
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
  });
