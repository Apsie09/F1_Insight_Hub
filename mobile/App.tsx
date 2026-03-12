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
import { StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { theme } from "./src/constants/theme";
import { AppNavigator } from "./src/navigation/AppNavigator";

export default function App() {
  const [fontsLoaded] = useFonts({
    [theme.fonts.headingSemi]: BarlowCondensed_600SemiBold,
    [theme.fonts.headingBold]: BarlowCondensed_700Bold,
    [theme.fonts.bodyRegular]: SourceSans3_400Regular,
    [theme.fonts.bodySemi]: SourceSans3_600SemiBold,
    [theme.fonts.bodyBold]: SourceSans3_700Bold,
  });

  if (!fontsLoaded) {
    return <View style={styles.splashFallback} />;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <AppNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  splashFallback: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});
