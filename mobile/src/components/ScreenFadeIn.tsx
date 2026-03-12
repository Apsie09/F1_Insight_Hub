import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, type ViewStyle } from "react-native";

type ScreenFadeInProps = {
  children: ReactNode;
  style?: ViewStyle;
};

export const ScreenFadeIn = ({ children, style }: ScreenFadeInProps) => {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 340,
      useNativeDriver: true,
    }).start();
  }, [opacity]);

  return (
    <Animated.View style={[styles.container, { opacity }, style]} testID="screen-fade-in">
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
