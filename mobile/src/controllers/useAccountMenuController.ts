import { useCallback, useState } from "react";

import { useAuth } from "../auth/AuthProvider";
import { useLanguage } from "../i18n/LanguageProvider";

export const getInitials = (displayName: string): string =>
  displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "U";

export const formatTimestamp = (value: string): string => {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return value;
  }
  return new Date(timestamp).toLocaleString();
};

export const useAccountMenuController = () => {
  const { t } = useLanguage();
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
      setLocalMessage(t("accountNewPasswordShort"));
      return;
    }
    if (confirmNewPassword !== newPassword) {
      setLocalMessage(t("accountNewPasswordsMismatch"));
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
      setLocalMessage(t("accountPasswordUpdated"));
    }
  }, [confirmNewPassword, currentPassword, newPassword, resetPassword, t]);

  const handleMarkNotificationsRead = useCallback(async () => {
    await markNotificationsRead();
  }, [markNotificationsRead]);

  const toggleMenu = useCallback(() => {
    setMenuOpen((current) => !current);
  }, []);

  const togglePasswordPanel = useCallback(() => {
    setPasswordPanelOpen((current) => !current);
    setLocalMessage(null);
    clearError();
  }, [clearError]);

  return {
    status,
    user,
    notifications,
    unreadNotificationCount,
    isSubmitting,
    error,
    menuOpen,
    passwordPanelOpen,
    currentPassword,
    newPassword,
    confirmNewPassword,
    localMessage,
    closeMenu,
    handleSignOut,
    handleSwitchAccount,
    handleResetPassword,
    handleMarkNotificationsRead,
    toggleMenu,
    togglePasswordPanel,
    setCurrentPassword,
    setNewPassword,
    setConfirmNewPassword,
  };
};
