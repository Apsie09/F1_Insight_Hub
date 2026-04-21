import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dimensions, Platform, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  NavigationContainer,
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
} from "@react-navigation/native";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HeaderActions } from "../components/HeaderActions";
import { APP_TAB_BAR_HEIGHT } from "../constants/layout";
import { useLanguage } from "../i18n/LanguageProvider";
import { HomeScreen } from "../screens/HomeScreen";
import { PredictionScreen } from "../screens/PredictionScreen";
import { RaceBrowserScreen } from "../screens/RaceBrowserScreen";
import { RaceDetailsScreen } from "../screens/RaceDetailsScreen";
import { RacerDetailsScreen } from "../screens/RacerDetailsScreen";
import { useAppTheme } from "../theme/AppThemeProvider";
import type {
  BrowseStackParamList,
  HomeStackParamList,
  PredictionStackParamList,
  RootTabParamList,
} from "../types/navigation";

const Tab = createMaterialTopTabNavigator<RootTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const BrowseStack = createNativeStackNavigator<BrowseStackParamList>();
const PredictionStack = createNativeStackNavigator<PredictionStackParamList>();

const HomeStackNavigator = () => {
  const { theme } = useAppTheme();
  const { t } = useLanguage();

  const sharedStackOptions = useMemo(
    () => ({
      headerStyle: {
        backgroundColor: theme.colors.surface,
      },
      headerTitleStyle: {
        fontFamily: theme.fonts.headingSemi,
        color: theme.colors.textPrimary,
        fontSize: Platform.OS === "ios" ? 22 : 24,
      },
      headerTintColor: theme.colors.textPrimary,
      headerTitleAlign: "left" as const,
      headerBackVisible: false,
      headerTitleContainerStyle: {
        paddingRight: Platform.OS === "ios" ? 150 : 92,
      },
    }),
    [theme]
  );

  return (
    <HomeStack.Navigator screenOptions={sharedStackOptions}>
      <HomeStack.Screen name="Home" component={HomeScreen} options={{ title: "F1 Insight Hub" }} />
      <HomeStack.Screen name="RaceDetails" component={RaceDetailsScreen} options={{ title: t("navRaceDetails") }} />
      <HomeStack.Screen
        name="RacerDetails"
        component={RacerDetailsScreen}
        options={{ title: t("navRacerDetails") }}
      />
    </HomeStack.Navigator>
  );
};

const BrowseStackNavigator = () => {
  const { theme } = useAppTheme();
  const { t } = useLanguage();

  const sharedStackOptions = useMemo(
    () => ({
      headerStyle: {
        backgroundColor: theme.colors.surface,
      },
      headerTitleStyle: {
        fontFamily: theme.fonts.headingSemi,
        color: theme.colors.textPrimary,
        fontSize: Platform.OS === "ios" ? 22 : 24,
      },
      headerTintColor: theme.colors.textPrimary,
      headerTitleAlign: "left" as const,
      headerBackVisible: false,
      headerTitleContainerStyle: {
        paddingRight: Platform.OS === "ios" ? 150 : 92,
      },
    }),
    [theme]
  );

  return (
    <BrowseStack.Navigator screenOptions={sharedStackOptions}>
      <BrowseStack.Screen
        name="RaceBrowser"
        component={RaceBrowserScreen}
        options={{ title: t("navRaceBrowser") }}
      />
      <BrowseStack.Screen name="RaceDetails" component={RaceDetailsScreen} options={{ title: t("navRaceDetails") }} />
      <BrowseStack.Screen
        name="RacerDetails"
        component={RacerDetailsScreen}
        options={{ title: t("navRacerDetails") }}
      />
    </BrowseStack.Navigator>
  );
};

const PredictionStackNavigator = () => {
  const { theme } = useAppTheme();
  const { t } = useLanguage();

  const sharedStackOptions = useMemo(
    () => ({
      headerStyle: {
        backgroundColor: theme.colors.surface,
      },
      headerTitleStyle: {
        fontFamily: theme.fonts.headingSemi,
        color: theme.colors.textPrimary,
        fontSize: Platform.OS === "ios" ? 22 : 24,
      },
      headerTintColor: theme.colors.textPrimary,
      headerTitleAlign: "left" as const,
      headerBackVisible: false,
      headerTitleContainerStyle: {
        paddingRight: Platform.OS === "ios" ? 150 : 92,
      },
    }),
    [theme]
  );

  return (
    <PredictionStack.Navigator screenOptions={sharedStackOptions}>
      <PredictionStack.Screen
        name="Prediction"
        component={PredictionScreen}
        options={{ title: t("navPrediction") }}
      />
    </PredictionStack.Navigator>
  );
};

export const AppNavigator = () => {
  const { theme, isDark } = useAppTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [swipeCoolingDown, setSwipeCoolingDown] = useState(false);
  const swipeCooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLayout = useMemo(() => ({ width: Dimensions.get("window").width }), []);
  // RN Web uses PanResponder for tab swipes and is prone to jitter with rapid drags in content-heavy pages.
  const swipeEnabledByPlatform = Platform.OS === "android";

  useEffect(() => {
    return () => {
      if (!swipeCooldownTimerRef.current) {
        return;
      }

      clearTimeout(swipeCooldownTimerRef.current);
      swipeCooldownTimerRef.current = null;
    };
  }, []);

  const startSwipeCooldown = useCallback(() => {
    if (swipeCooldownTimerRef.current) {
      clearTimeout(swipeCooldownTimerRef.current);
    }

    setSwipeCoolingDown(true);
    swipeCooldownTimerRef.current = setTimeout(() => {
      setSwipeCoolingDown(false);
      swipeCooldownTimerRef.current = null;
    }, 140);
  }, []);

  const navTheme = useMemo(
    () => ({
      ...(isDark ? NavigationDarkTheme : NavigationDefaultTheme),
      dark: isDark,
      colors: {
        ...(isDark ? NavigationDarkTheme.colors : NavigationDefaultTheme.colors),
        background: theme.colors.background,
        card: theme.colors.surface,
        text: theme.colors.textPrimary,
        border: theme.colors.border,
        primary: theme.colors.accent,
        notification: theme.colors.accent,
      },
    }),
    [isDark, theme]
  );

  return (
    <NavigationContainer theme={navTheme} direction="ltr">
      <View style={styles.navigatorRoot}>
        <Tab.Navigator
          tabBarPosition="bottom"
          initialLayout={initialLayout}
          keyboardDismissMode="on-drag"
          overScrollMode="never"
          screenListeners={{
            swipeEnd: startSwipeCooldown,
          }}
          screenOptions={({ route }) => ({
            headerShown: false,
            swipeEnabled: swipeEnabledByPlatform && !swipeCoolingDown,
            animationEnabled: true,
            sceneStyle: {
              backgroundColor: theme.colors.background,
            },
            tabBarShowIcon: true,
            tabBarActiveTintColor: theme.colors.accent,
            tabBarInactiveTintColor: theme.colors.textSecondary,
            tabBarLabelStyle: {
              fontFamily: theme.fonts.bodySemi,
              fontSize: theme.typeScale.caption,
            },
            tabBarIndicatorStyle: {
              backgroundColor: theme.colors.accent,
              height: 3,
            },
            tabBarStyle: {
              minHeight: APP_TAB_BAR_HEIGHT,
              paddingTop: 4,
              paddingBottom: 8,
              borderTopColor: theme.colors.border,
              borderTopWidth: 1,
              backgroundColor: theme.colors.surface,
            },
            tabBarIcon: ({ color }) => {
              const iconByRoute: Record<keyof RootTabParamList, keyof typeof Ionicons.glyphMap> = {
                HomeTab: "home",
                BrowseTab: "list",
                PredictionTab: "sparkles",
              };

              const iconName = iconByRoute[route.name as keyof RootTabParamList];
              return <Ionicons name={iconName} size={18} color={color} />;
            },
          })}
        >
          <Tab.Screen
            name="HomeTab"
            component={HomeStackNavigator}
            options={{
              title: t("navHome"),
              tabBarButtonTestID: "tab-home",
            }}
          />
          <Tab.Screen
            name="BrowseTab"
            component={BrowseStackNavigator}
            options={{
              title: t("navBrowse"),
              tabBarButtonTestID: "tab-browse",
            }}
          />
          <Tab.Screen
            name="PredictionTab"
            component={PredictionStackNavigator}
            options={{
              title: t("navPrediction"),
              tabBarButtonTestID: "tab-prediction",
            }}
          />
        </Tab.Navigator>
        <View
          pointerEvents="box-none"
          style={[styles.headerThemeOverlay, { top: insets.top + 7 }]}
        >
          <HeaderActions showTheme showAccount={false} />
        </View>
        <View
          pointerEvents="box-none"
          style={[styles.headerAccountOverlay, { top: insets.top + 7 }]}
        >
          <HeaderActions showTheme={false} showAccount />
        </View>
      </View>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  navigatorRoot: {
    flex: 1,
  },
  headerThemeOverlay: {
    position: "absolute",
    left: 12,
    zIndex: 100,
    elevation: 100,
  },
  headerAccountOverlay: {
    position: "absolute",
    right: 12,
    zIndex: 100,
    elevation: 100,
  },
});
