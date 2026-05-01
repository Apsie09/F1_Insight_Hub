import { useCallback, useState } from "react";

import { useAuth } from "../auth/AuthProvider";
import { useLanguage } from "../i18n/LanguageProvider";
import type { AuthMode } from "../types/auth";

const isValidEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim().toLowerCase());

export const useAuthOverlayController = () => {
  const { t } = useLanguage();
  const { status, login, register, isSubmitting, error, clearError } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  const switchMode = useCallback(
    (nextMode: AuthMode) => {
      setMode(nextMode);
      setValidationMessage(null);
      clearError();
    },
    [clearError]
  );

  const submit = useCallback(async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedName = displayName.trim();

    if (!isValidEmail(normalizedEmail)) {
      setValidationMessage(t("authInvalidEmail"));
      return;
    }

    if (password.length < 8) {
      setValidationMessage(t("authPasswordShort"));
      return;
    }

    if (mode === "register" && confirmPassword !== password) {
      setValidationMessage(t("authPasswordsMismatch"));
      return;
    }

    if (mode === "register" && !trimmedName) {
      setValidationMessage(t("authMissingName"));
      return;
    }

    setValidationMessage(null);
    clearError();

    if (mode === "login") {
      await login({ email: normalizedEmail, password });
      return;
    }

    await register({
      displayName: trimmedName,
      email: normalizedEmail,
      password,
    });
  }, [clearError, confirmPassword, displayName, email, login, mode, password, register, t]);

  return {
    status,
    mode,
    displayName,
    email,
    password,
    confirmPassword,
    validationMessage,
    isSubmitting,
    error,
    submitLabel: mode === "login" ? t("authLogin") : t("authCreateAccount"),
    setDisplayName,
    setEmail,
    setPassword,
    setConfirmPassword,
    switchMode,
    submit,
  };
};
