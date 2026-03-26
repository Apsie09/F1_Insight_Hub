import { useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  NavigationContainer,
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
} from "@react-navigation/native";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { ThemeSwitch } from "../components/ThemeSwitch";
import { APP_TAB_BAR_HEIGHT } from "../constants/layout";
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

export const AppNavigator = () => {
  const { theme, isDark } = useAppTheme();

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

  const sharedStackOptions = useMemo(
    () => ({
      headerStyle: {
        backgroundColor: theme.colors.surface,
      },
      headerTitleStyle: {
        fontFamily: theme.fonts.headingSemi,
        color: theme.colors.textPrimary,
      },
      headerTintColor: theme.colors.textPrimary,
      headerRight: () => <ThemeSwitch />,
    }),
    [theme]
  );

  const HomeStackNavigator = () => (
    <HomeStack.Navigator screenOptions={sharedStackOptions}>
      <HomeStack.Screen name="Home" component={HomeScreen} options={{ title: "F1 Insight Hub" }} />
      <HomeStack.Screen name="RaceDetails" component={RaceDetailsScreen} options={{ title: "Race Details" }} />
      <HomeStack.Screen
        name="RacerDetails"
        component={RacerDetailsScreen}
        options={{ title: "Racer Intelligence" }}
      />
    </HomeStack.Navigator>
  );

  const BrowseStackNavigator = () => (
    <BrowseStack.Navigator screenOptions={sharedStackOptions}>
      <BrowseStack.Screen
        name="RaceBrowser"
        component={RaceBrowserScreen}
        options={{ title: "Season Race Browser" }}
      />
      <BrowseStack.Screen name="RaceDetails" component={RaceDetailsScreen} options={{ title: "Race Details" }} />
      <BrowseStack.Screen
        name="RacerDetails"
        component={RacerDetailsScreen}
        options={{ title: "Racer Intelligence" }}
      />
    </BrowseStack.Navigator>
  );

  const PredictionStackNavigator = () => (
    <PredictionStack.Navigator screenOptions={sharedStackOptions}>
      <PredictionStack.Screen
        name="Prediction"
        component={PredictionScreen}
        options={{ title: "Prediction Calculator" }}
      />
    </PredictionStack.Navigator>
  );

  return (
    <NavigationContainer theme={navTheme}>
      <Tab.Navigator
        tabBarPosition="bottom"
        screenOptions={({ route }) => ({
          headerShown: false,
          swipeEnabled: true,
          animationEnabled: true,
          gestureHandlerProps: {
            activeOffsetX: [-24, 24],
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
            title: "Home",
            tabBarButtonTestID: "tab-home",
          }}
        />
        <Tab.Screen
          name="BrowseTab"
          component={BrowseStackNavigator}
          options={{
            title: "Browse",
            tabBarButtonTestID: "tab-browse",
          }}
        />
        <Tab.Screen
          name="PredictionTab"
          component={PredictionStackNavigator}
          options={{
            title: "Prediction",
            tabBarButtonTestID: "tab-prediction",
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};
