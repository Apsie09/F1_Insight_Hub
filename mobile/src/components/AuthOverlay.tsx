import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  LayoutChangeEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "../auth/AuthProvider";
import { fontFamily } from "../constants/theme";
import type { AppTheme } from "../constants/theme";
import { useLanguage } from "../i18n/LanguageProvider";
import { useAppTheme } from "../theme/AppThemeProvider";
import type { AuthMode } from "../types/auth";

const isValidEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim().toLowerCase());

export const AuthOverlay = () => {
  const { theme } = useAppTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { status, login, register, isSubmitting, error, clearError } = useAuth();

  const [mode, setMode] = useState<AuthMode>("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [modeTrackWidth, setModeTrackWidth] = useState(0);

  const entranceProgress = useRef(new Animated.Value(0)).current;
  const modeProgress = useRef(new Animated.Value(0)).current;
  const registerFieldProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    entranceProgress.setValue(0);
    Animated.timing(entranceProgress, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [entranceProgress]);

  useEffect(() => {
    Animated.timing(modeProgress, {
      toValue: mode === "login" ? 0 : 1,
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();

    Animated.timing(registerFieldProgress, {
      toValue: mode === "register" ? 1 : 0,
      duration: 170,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [mode, modeProgress, registerFieldProgress]);

  if (status !== "signedOut") {
    return null;
  }

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setValidationMessage(null);
    clearError();
  };

  const submit = async () => {
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
  };

  const onModeTrackLayout = (event: LayoutChangeEvent) => {
    setModeTrackWidth(event.nativeEvent.layout.width);
  };

  const indicatorInset = 3;
  const indicatorWidth = Math.max(0, (modeTrackWidth - indicatorInset * 2) / 2);
  const indicatorTravel = indicatorWidth;

  const animatedBackdropOpacity = entranceProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.72],
  });

  const animatedCardOpacity = entranceProgress;
  const animatedCardTranslateY = entranceProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });
  const animatedCardScale = entranceProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.98, 1],
  });

  const animatedModeIndicatorTranslateX = modeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, indicatorTravel],
  });

  const animatedRegisterHeight = registerFieldProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 86],
  });

  const submitLabel = mode === "login" ? t("authLogin") : t("authCreateAccount");

  return (
    <View style={styles.overlayRoot} testID="auth-overlay">
      <Animated.View style={[styles.backdrop, { opacity: animatedBackdropOpacity }]} />
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={8}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.card,
              {
                opacity: animatedCardOpacity,
                transform: [{ translateY: animatedCardTranslateY }, { scale: animatedCardScale }],
              },
            ]}
          >
            <Text style={styles.eyebrow}>{t("authEyebrow")}</Text>
            <Text style={styles.title}>{t("authTitle")}</Text>
            <Text style={styles.subtitle}>{t("authSubtitle")}</Text>

            <View style={styles.modeRow} onLayout={onModeTrackLayout}>
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.modeIndicator,
                  {
                    left: indicatorInset,
                    width: indicatorWidth,
                    transform: [{ translateX: animatedModeIndicatorTranslateX }],
                  },
                ]}
              />
              <Pressable style={styles.modeChip} onPress={() => switchMode("login")} testID="auth-mode-login">
                <Text style={[styles.modeLabel, mode === "login" && styles.modeLabelSelected]}>
                  {t("authLogin")}
                </Text>
              </Pressable>
              <Pressable
                style={styles.modeChip}
                onPress={() => switchMode("register")}
                testID="auth-mode-register"
              >
                <Text style={[styles.modeLabel, mode === "register" && styles.modeLabelSelected]}>
                  {t("authCreateAccount")}
                </Text>
              </Pressable>
            </View>

            <Animated.View
              style={[
                styles.registerFieldWrap,
                {
                  height: animatedRegisterHeight,
                  opacity: registerFieldProgress,
                },
              ]}
              pointerEvents={mode === "register" ? "auto" : "none"}
            >
              <View style={styles.fieldBlock}>
                <Text style={styles.label}>{t("authDisplayName")}</Text>
                <TextInput
                  value={displayName}
                  onChangeText={setDisplayName}
                  style={styles.input}
                  autoCapitalize="words"
                  autoCorrect={false}
                  placeholder={t("authDisplayNamePlaceholder")}
                  placeholderTextColor={theme.colors.textSecondary}
                  testID="auth-input-display-name"
                />
              </View>
            </Animated.View>

            <View style={styles.fieldBlock}>
              <Text style={styles.label}>{t("authEmail")}</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                placeholder="name@example.com"
                placeholderTextColor={theme.colors.textSecondary}
                testID="auth-input-email"
              />
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.label}>{t("authPassword")}</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                style={styles.input}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                textContentType={mode === "login" ? "password" : "newPassword"}
                placeholder={t("authPasswordPlaceholder")}
                placeholderTextColor={theme.colors.textSecondary}
                testID="auth-input-password"
              />
            </View>

            {mode === "register" ? (
              <View style={styles.fieldBlock}>
                <Text style={styles.label}>{t("authConfirmPassword")}</Text>
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  style={styles.input}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="newPassword"
                  placeholder={t("authConfirmPasswordPlaceholder")}
                  placeholderTextColor={theme.colors.textSecondary}
                  testID="auth-input-confirm-password"
                />
              </View>
            ) : null}

            {validationMessage ? <Text style={styles.validation}>{validationMessage}</Text> : null}
            {error ? <Text style={styles.validation}>{error}</Text> : null}

            <Pressable
              style={({ pressed }) => [
                styles.submitButton,
                isSubmitting && styles.submitDisabled,
                pressed && !isSubmitting && styles.submitPressed,
              ]}
              onPress={submit}
              disabled={isSubmitting}
              testID="auth-submit-button"
            >
              {isSubmitting ? (
                <View style={styles.submitContent}>
                  <ActivityIndicator size="small" color={theme.colors.surface} />
                  <Text style={styles.submitText}>{t("authSubmitting")}</Text>
                </View>
              ) : (
                <Text style={styles.submitText}>{submitLabel}</Text>
              )}
            </Pressable>

            <Text style={styles.footnote}>
              {t("authFootnote")}
            </Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    overlayRoot: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: "center",
      zIndex: 60,
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.colors.menuBackdrop,
    },
    keyboardContainer: {
      flex: 1,
      justifyContent: "center",
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: "center",
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xl,
    },
    card: {
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.lg,
      gap: theme.spacing.sm,
      ...theme.shadows.card,
    },
    eyebrow: {
      fontFamily: fontFamily.bodySemi,
      color: theme.colors.accent,
      fontSize: theme.typeScale.caption,
      textTransform: "uppercase",
      letterSpacing: 1,
    },
    title: {
      fontFamily: fontFamily.headingBold,
      color: theme.colors.textPrimary,
      fontSize: theme.typeScale.h1,
      lineHeight: 36,
    },
    subtitle: {
      fontFamily: fontFamily.bodyRegular,
      color: theme.colors.textSecondary,
      fontSize: theme.typeScale.body,
      lineHeight: 22,
    },
    modeRow: {
      marginTop: theme.spacing.xs,
      flexDirection: "row",
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceMuted,
      padding: 3,
      position: "relative",
      overflow: "hidden",
    },
    modeIndicator: {
      position: "absolute",
      top: 3,
      bottom: 3,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.accentSoft,
      borderWidth: 1,
      borderColor: theme.colors.accent,
    },
    modeChip: {
      flex: 1,
      minHeight: 42,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: theme.spacing.sm,
      zIndex: 2,
    },
    modeLabel: {
      fontFamily: fontFamily.bodySemi,
      color: theme.colors.textSecondary,
      fontSize: theme.typeScale.bodySmall,
    },
    modeLabelSelected: {
      color: theme.colors.accent,
    },
    registerFieldWrap: {
      overflow: "hidden",
    },
    fieldBlock: {
      gap: theme.spacing.xs,
    },
    label: {
      fontFamily: fontFamily.bodySemi,
      color: theme.colors.textPrimary,
      fontSize: theme.typeScale.bodySmall,
    },
    input: {
      minHeight: 46,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceMuted,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      fontFamily: fontFamily.bodyRegular,
      fontSize: theme.typeScale.body,
      color: theme.colors.textPrimary,
    },
    validation: {
      fontFamily: fontFamily.bodySemi,
      color: theme.colors.error,
      fontSize: theme.typeScale.bodySmall,
    },
    submitButton: {
      marginTop: theme.spacing.xs,
      minHeight: 46,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.accent,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: theme.spacing.md,
    },
    submitDisabled: {
      opacity: 0.7,
    },
    submitPressed: {
      opacity: 0.9,
    },
    submitContent: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.xs,
    },
    submitText: {
      fontFamily: fontFamily.bodyBold,
      color: theme.colors.surface,
      fontSize: theme.typeScale.body,
    },
    footnote: {
      marginTop: theme.spacing.xs,
      fontFamily: fontFamily.bodyRegular,
      color: theme.colors.textSecondary,
      fontSize: theme.typeScale.caption,
      lineHeight: 18,
    },
  });
