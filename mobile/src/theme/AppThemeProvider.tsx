import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, useColorScheme } from "react-native";

import { darkTheme, lightTheme } from "../constants/theme";
import type { AppTheme, ThemeMode } from "../constants/theme";

type AppThemeContextValue = {
  mode: ThemeMode;
  isDark: boolean;
  theme: AppTheme;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  transitionOverlayColor: string;
  transitionOpacity: Animated.Value;
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

type AppThemeProviderProps = {
  children: ReactNode;
};

const getSystemMode = (scheme: ReturnType<typeof useColorScheme>): ThemeMode =>
  scheme === "dark" ? "dark" : "light";

export const AppThemeProvider = ({ children }: AppThemeProviderProps) => {
  const systemMode = getSystemMode(useColorScheme());
  const [mode, setMode] = useState<ThemeMode>(systemMode);
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);
  const [transitionOverlayColor, setTransitionOverlayColor] = useState(lightTheme.colors.background);
  const transitionOpacity = useRef(new Animated.Value(0)).current;

  const theme = mode === "dark" ? darkTheme : lightTheme;

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (active) {
          setReduceMotionEnabled(enabled);
        }
      })
      .catch(() => {
        // Keep the default when the API isn't available.
      });

    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotionEnabled);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  const runThemeTransition = (nextMode: ThemeMode) => {
    if (nextMode === mode) {
      return;
    }

    const fromTheme = mode === "dark" ? darkTheme : lightTheme;
    setTransitionOverlayColor(fromTheme.colors.background);
    transitionOpacity.stopAnimation();

    if (reduceMotionEnabled) {
      transitionOpacity.setValue(0);
      setMode(nextMode);
      return;
    }

    transitionOpacity.setValue(1);
    setMode(nextMode);
    Animated.timing(transitionOpacity, {
      toValue: 0,
      duration: 220,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  const value = useMemo<AppThemeContextValue>(
    () => ({
      mode,
      isDark: mode === "dark",
      theme,
      setMode: (nextMode: ThemeMode) => setMode(nextMode),
      toggleTheme: () => runThemeTransition(mode === "dark" ? "light" : "dark"),
      transitionOverlayColor,
      transitionOpacity,
    }),
    [mode, reduceMotionEnabled, theme, transitionOpacity, transitionOverlayColor]
  );

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
};

export const useAppTheme = () => {
  const context = useContext(AppThemeContext);
  if (!context) {
    throw new Error("useAppTheme must be used inside AppThemeProvider.");
  }
  return context;
};
