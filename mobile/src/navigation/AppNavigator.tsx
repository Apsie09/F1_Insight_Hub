import { Ionicons } from "@expo/vector-icons";
import { NavigationContainer, DefaultTheme as NavigationDefaultTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { theme } from "../constants/theme";
import { HomeScreen } from "../screens/HomeScreen";
import { PredictionScreen } from "../screens/PredictionScreen";
import { RaceBrowserScreen } from "../screens/RaceBrowserScreen";
import { RaceDetailsScreen } from "../screens/RaceDetailsScreen";
import { RacerDetailsScreen } from "../screens/RacerDetailsScreen";
import type {
  BrowseStackParamList,
  HomeStackParamList,
  PredictionStackParamList,
  RootTabParamList,
} from "../types/navigation";

const Tab = createBottomTabNavigator<RootTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const BrowseStack = createNativeStackNavigator<BrowseStackParamList>();
const PredictionStack = createNativeStackNavigator<PredictionStackParamList>();

const navTheme = {
  ...NavigationDefaultTheme,
  colors: {
    ...NavigationDefaultTheme.colors,
    background: theme.colors.background,
    card: theme.colors.surface,
    text: theme.colors.textPrimary,
    border: theme.colors.border,
    primary: theme.colors.accent,
  },
};

const sharedStackOptions = {
  headerStyle: {
    backgroundColor: theme.colors.surface,
  },
  headerTitleStyle: {
    fontFamily: theme.fonts.headingSemi,
    color: theme.colors.textPrimary,
  },
  headerTintColor: theme.colors.textPrimary,
};

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

export const AppNavigator = () => {
  return (
    <NavigationContainer theme={navTheme}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: theme.colors.accent,
          tabBarInactiveTintColor: theme.colors.textSecondary,
          tabBarLabelStyle: {
            fontFamily: theme.fonts.bodySemi,
            fontSize: theme.typeScale.caption,
          },
          tabBarStyle: {
            height: 64,
            paddingTop: 6,
            borderTopColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
          },
          tabBarIcon: ({ color, size }) => {
            const iconByRoute: Record<keyof RootTabParamList, keyof typeof Ionicons.glyphMap> = {
              HomeTab: "home",
              BrowseTab: "list",
              PredictionTab: "sparkles",
            };

            const iconName = iconByRoute[route.name as keyof RootTabParamList];
            return <Ionicons name={iconName} size={size} color={color} />;
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
