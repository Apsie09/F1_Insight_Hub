import "react-native-gesture-handler";

import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import {
  BarlowCondensed_600SemiBold,
  BarlowCondensed_700Bold,
} from "@expo-google-fonts/barlow-condensed";
import {
  SourceSans3_400Regular,
  SourceSans3_600SemiBold,
  SourceSans3_700Bold,
} from "@expo-google-fonts/source-sans-3";
import { Animated, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider, useAuth } from "./src/auth/AuthProvider";
import { AuthOverlay } from "./src/components/AuthOverlay";
import { lightTheme } from "./src/constants/theme";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { AppThemeProvider, useAppTheme } from "./src/theme/AppThemeProvider";

const ThemedApp = () => {
  const { isDark, transitionOpacity, transitionOverlayColor } = useAppTheme();
  const { status } = useAuth();
  const shouldRenderAuthGate =
    process.env.NODE_ENV !== "test" || process.env.EXPO_PUBLIC_TEST_AUTH_GATE === "enabled";
  const shouldRenderNavigator = !shouldRenderAuthGate || status === "signedIn";

  return (
    <View style={styles.themedRoot}>
      <StatusBar style={isDark ? "light" : "dark"} />
      {shouldRenderNavigator ? <AppNavigator /> : <View style={styles.authBackground} />}
      {shouldRenderAuthGate && status === "signedOut" ? <AuthOverlay /> : null}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          {
            opacity: transitionOpacity,
            backgroundColor: transitionOverlayColor,
          },
        ]}
      />
    </View>
  );
};

export default function App() {
  const [fontsLoaded] = useFonts({
    [lightTheme.fonts.headingSemi]: BarlowCondensed_600SemiBold,
    [lightTheme.fonts.headingBold]: BarlowCondensed_700Bold,
    [lightTheme.fonts.bodyRegular]: SourceSans3_400Regular,
    [lightTheme.fonts.bodySemi]: SourceSans3_600SemiBold,
    [lightTheme.fonts.bodyBold]: SourceSans3_700Bold,
  });

  if (!fontsLoaded) {
    return <View style={styles.splashFallback} />;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <AppThemeProvider>
          <AuthProvider>
            <ThemedApp />
          </AuthProvider>
        </AppThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  themedRoot: {
    flex: 1,
  },
  authBackground: {
    flex: 1,
    backgroundColor: lightTheme.colors.background,
  },
  splashFallback: {
    flex: 1,
    backgroundColor: lightTheme.colors.background,
  },
});
