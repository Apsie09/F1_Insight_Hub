import { useCallback, useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../auth/AuthProvider";
import type { AppTheme } from "../constants/theme";
import { useAppTheme } from "../theme/AppThemeProvider";
import { DataSourceBadge } from "./DataSourceBadge";
import { ThemeSwitch } from "./ThemeSwitch";

export const HeaderActions = () => {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { status, signOut } = useAuth();

  const handleSignOut = useCallback(() => {
    void signOut();
  }, [signOut]);

  return (
    <View style={styles.container}>
      <DataSourceBadge />
      <ThemeSwitch />
      {status === "signedIn" ? (
        <Pressable
          onPress={handleSignOut}
          style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
          accessibilityRole="button"
          accessibilityLabel="Log out"
          testID="header-signout-button"
        >
          <Ionicons name="log-out-outline" size={18} color={theme.colors.textPrimary} />
        </Pressable>
      ) : null}
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
    iconButton: {
      minWidth: 34,
      minHeight: 34,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    iconButtonPressed: {
      opacity: 0.75,
    },
  });
