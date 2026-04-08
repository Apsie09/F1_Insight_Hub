import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../auth/AuthProvider";
import type { AppTheme } from "../constants/theme";
import { fontFamily } from "../constants/theme";
import { useAppTheme } from "../theme/AppThemeProvider";
import { DataSourceBadge } from "./DataSourceBadge";
import { ThemeSwitch } from "./ThemeSwitch";

const getInitials = (displayName: string): string =>
  displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "U";

const formatTimestamp = (value: string): string => {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return value;
  }
  return new Date(timestamp).toLocaleString();
};

export const HeaderActions = () => {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const {
    status,
    user,
    notifications,
    unreadNotificationCount,
    signOut,
    switchAccount,
    resetPassword,
    markNotificationsRead,
    isSubmitting,
    error,
    clearError,
  } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [passwordPanelOpen, setPasswordPanelOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [localMessage, setLocalMessage] = useState<string | null>(null);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    setPasswordPanelOpen(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setLocalMessage(null);
    clearError();
  }, [clearError]);

  const handleSignOut = useCallback(async () => {
    closeMenu();
    await signOut();
  }, [closeMenu, signOut]);

  const handleSwitchAccount = useCallback(async () => {
    closeMenu();
    await switchAccount();
  }, [closeMenu, switchAccount]);

  const handleResetPassword = useCallback(async () => {
    if (newPassword.length < 8) {
      setLocalMessage("New password must be at least 8 characters.");
      return;
    }
    if (confirmNewPassword !== newPassword) {
      setLocalMessage("New passwords do not match.");
      return;
    }
    const ok = await resetPassword({
      currentPassword,
      newPassword,
    });
    if (ok) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setPasswordPanelOpen(false);
      setLocalMessage("Password updated.");
    }
  }, [confirmNewPassword, currentPassword, newPassword, resetPassword]);

  const handleMarkNotificationsRead = useCallback(async () => {
    await markNotificationsRead();
  }, [markNotificationsRead]);

  const toggleMenu = useCallback(() => {
    setMenuOpen((current) => !current);
  }, []);

  if (status !== "signedIn" || !user) {
    return (
      <View style={styles.container}>
        <DataSourceBadge />
        <ThemeSwitch />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <DataSourceBadge />
      <ThemeSwitch />
      <View style={styles.accountWrap}>
        <Pressable
          onPress={toggleMenu}
          style={({ pressed }) => [styles.accountButton, pressed && styles.accountButtonPressed]}
          accessibilityRole="button"
          accessibilityLabel="Open account menu"
          testID="header-account-button"
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(user.displayName)}</Text>
          </View>
          <Text numberOfLines={1} style={styles.accountLabel}>
            {user.displayName}
          </Text>
          {unreadNotificationCount > 0 ? (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>{Math.min(unreadNotificationCount, 9)}</Text>
            </View>
          ) : null}
          <Ionicons
            name={menuOpen ? "chevron-up-outline" : "chevron-down-outline"}
            size={16}
            color={theme.colors.textPrimary}
          />
        </Pressable>

        {menuOpen ? (
          <View style={styles.menuPanel} testID="header-account-menu">
            <ScrollView style={styles.menuScroll} contentContainerStyle={styles.menuScrollContent}>
              <Text style={styles.menuTitle}>{user.displayName}</Text>
              <Text style={styles.menuSubtitle}>{user.email}</Text>

              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Notifications</Text>
                  {unreadNotificationCount > 0 ? (
                    <Pressable
                      onPress={() => void handleMarkNotificationsRead()}
                      style={({ pressed }) => [styles.inlineAction, pressed && styles.menuActionPressed]}
                      testID="header-notifications-read-button"
                    >
                      <Ionicons name="mail-open-outline" size={16} color={theme.colors.textPrimary} />
                      <Text style={styles.inlineActionText}>Mark all read</Text>
                    </Pressable>
                  ) : null}
                </View>
                {notifications.length === 0 ? (
                  <Text style={styles.emptyState}>No account notifications yet.</Text>
                ) : (
                  notifications.slice(0, 5).map((notification) => (
                    <View key={notification.id} style={styles.notificationCard}>
                      <View style={styles.notificationTitleRow}>
                        <Text style={styles.notificationTitle}>{notification.title}</Text>
                        {!notification.readAt ? <View style={styles.notificationDot} /> : null}
                      </View>
                      <Text style={styles.notificationMessage}>{notification.message}</Text>
                      <Text style={styles.notificationMeta}>{formatTimestamp(notification.createdAt)}</Text>
                    </View>
                  ))
                )}
              </View>

              <View style={styles.section}>
                <Pressable
                  onPress={() => {
                    setPasswordPanelOpen((current) => !current);
                    setLocalMessage(null);
                    clearError();
                  }}
                  style={({ pressed }) => [styles.menuAction, pressed && styles.menuActionPressed]}
                  testID="header-password-toggle-button"
                >
                  <Ionicons name="key-outline" size={16} color={theme.colors.textPrimary} />
                  <Text style={styles.menuActionText}>Reset password</Text>
                </Pressable>

                {passwordPanelOpen ? (
                  <View style={styles.passwordPanel}>
                    <TextInput
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                      style={styles.input}
                      placeholder="Current password"
                      placeholderTextColor={theme.colors.textSecondary}
                      secureTextEntry
                      autoCapitalize="none"
                      testID="header-current-password-input"
                    />
                    <TextInput
                      value={newPassword}
                      onChangeText={setNewPassword}
                      style={styles.input}
                      placeholder="New password"
                      placeholderTextColor={theme.colors.textSecondary}
                      secureTextEntry
                      autoCapitalize="none"
                      testID="header-new-password-input"
                    />
                    <TextInput
                      value={confirmNewPassword}
                      onChangeText={setConfirmNewPassword}
                      style={styles.input}
                      placeholder="Confirm new password"
                      placeholderTextColor={theme.colors.textSecondary}
                      secureTextEntry
                      autoCapitalize="none"
                      testID="header-confirm-password-input"
                    />
                    <Pressable
                      onPress={() => void handleResetPassword()}
                      disabled={isSubmitting}
                      style={({ pressed }) => [
                        styles.primaryAction,
                        pressed && styles.menuActionPressed,
                        isSubmitting && styles.disabledAction,
                      ]}
                      testID="header-password-submit-button"
                    >
                      <Text style={styles.primaryActionText}>Update password</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>

              {localMessage ? <Text style={styles.feedbackSuccess}>{localMessage}</Text> : null}
              {error ? <Text style={styles.feedbackError}>{error}</Text> : null}

              <Pressable
                onPress={() => void handleSwitchAccount()}
                style={({ pressed }) => [styles.menuAction, pressed && styles.menuActionPressed]}
                testID="header-switch-account-button"
              >
                <Ionicons name="swap-horizontal-outline" size={16} color={theme.colors.textPrimary} />
                <Text style={styles.menuActionText}>Switch account</Text>
              </Pressable>

              <Pressable
                onPress={() => void handleSignOut()}
                style={({ pressed }) => [styles.menuAction, pressed && styles.menuActionPressed]}
                testID="header-signout-button"
              >
                <Ionicons name="log-out-outline" size={16} color={theme.colors.textPrimary} />
                <Text style={styles.menuActionText}>Log out</Text>
              </Pressable>
            </ScrollView>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      position: "relative",
    },
    accountWrap: {
      position: "relative",
    },
    accountButton: {
      maxWidth: 190,
      minHeight: 34,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceMuted,
      paddingHorizontal: theme.spacing.xs,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    accountButtonPressed: {
      opacity: 0.8,
    },
    avatar: {
      width: 24,
      height: 24,
      borderRadius: 999,
      backgroundColor: theme.colors.accentSoft,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      fontFamily: fontFamily.bodyBold,
      fontSize: theme.typeScale.caption,
      color: theme.colors.textPrimary,
    },
    accountLabel: {
      flexShrink: 1,
      fontFamily: fontFamily.bodySemi,
      fontSize: theme.typeScale.caption,
      color: theme.colors.textPrimary,
    },
    notificationBadge: {
      minWidth: 18,
      height: 18,
      borderRadius: 999,
      backgroundColor: theme.colors.accent,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 4,
    },
    notificationBadgeText: {
      fontFamily: fontFamily.bodyBold,
      fontSize: 10,
      color: theme.colors.background,
    },
    menuPanel: {
      position: "absolute",
      top: 40,
      right: 0,
      width: 320,
      maxHeight: 520,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      ...theme.shadows.card,
      zIndex: 80,
    },
    menuScroll: {
      maxHeight: 520,
    },
    menuScrollContent: {
      padding: theme.spacing.sm,
      gap: theme.spacing.sm,
    },
    menuTitle: {
      fontFamily: fontFamily.headingSemi,
      fontSize: theme.typeScale.body,
      color: theme.colors.textPrimary,
    },
    menuSubtitle: {
      fontFamily: fontFamily.bodyRegular,
      fontSize: theme.typeScale.caption,
      color: theme.colors.textSecondary,
    },
    section: {
      gap: theme.spacing.xs,
    },
    sectionHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.xs,
    },
    sectionTitle: {
      fontFamily: fontFamily.bodyBold,
      fontSize: theme.typeScale.caption,
      color: theme.colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    inlineAction: {
      minHeight: 32,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.sm,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      backgroundColor: theme.colors.surfaceMuted,
    },
    inlineActionText: {
      fontFamily: fontFamily.bodySemi,
      fontSize: theme.typeScale.caption,
      color: theme.colors.textPrimary,
    },
    notificationCard: {
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceMuted,
      padding: theme.spacing.sm,
      gap: 4,
    },
    notificationTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.xs,
    },
    notificationTitle: {
      flex: 1,
      fontFamily: fontFamily.bodySemi,
      fontSize: theme.typeScale.body,
      color: theme.colors.textPrimary,
    },
    notificationDot: {
      width: 8,
      height: 8,
      borderRadius: 999,
      backgroundColor: theme.colors.accent,
    },
    notificationMessage: {
      fontFamily: fontFamily.bodyRegular,
      fontSize: theme.typeScale.caption,
      color: theme.colors.textSecondary,
    },
    notificationMeta: {
      fontFamily: fontFamily.bodyRegular,
      fontSize: 11,
      color: theme.colors.textSecondary,
    },
    passwordPanel: {
      gap: theme.spacing.xs,
      paddingTop: theme.spacing.xs,
    },
    input: {
      minHeight: 42,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: theme.colors.background,
      color: theme.colors.textPrimary,
      fontFamily: fontFamily.bodyRegular,
      fontSize: theme.typeScale.body,
    },
    primaryAction: {
      minHeight: 38,
      borderRadius: theme.radius.md,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.accent,
      paddingHorizontal: theme.spacing.sm,
    },
    primaryActionText: {
      fontFamily: fontFamily.bodyBold,
      fontSize: theme.typeScale.body,
      color: theme.colors.background,
    },
    menuAction: {
      minHeight: 38,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.sm,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      backgroundColor: theme.colors.surfaceMuted,
    },
    menuActionPressed: {
      opacity: 0.8,
    },
    menuActionText: {
      fontFamily: fontFamily.bodySemi,
      fontSize: theme.typeScale.body,
      color: theme.colors.textPrimary,
    },
    disabledAction: {
      opacity: 0.5,
    },
    emptyState: {
      fontFamily: fontFamily.bodyRegular,
      fontSize: theme.typeScale.caption,
      color: theme.colors.textSecondary,
    },
    feedbackSuccess: {
      fontFamily: fontFamily.bodySemi,
      fontSize: theme.typeScale.caption,
      color: theme.colors.success,
    },
    feedbackError: {
      fontFamily: fontFamily.bodySemi,
      fontSize: theme.typeScale.caption,
      color: theme.colors.error,
    },
  });
