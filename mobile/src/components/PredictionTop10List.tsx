import { useEffect, useMemo } from "react";
import { Animated, StyleSheet, View } from "react-native";

import type { Top10PredictionEntry } from "../types/domain";
import { RacerRowCard } from "./RacerRowCard";

type PredictionTop10ListProps = {
  entries: Top10PredictionEntry[];
  onSelectRacer: (entry: Top10PredictionEntry) => void;
};

export const PredictionTop10List = ({ entries, onSelectRacer }: PredictionTop10ListProps) => {
  const animatedValues = useMemo(
    () => entries.map(() => new Animated.Value(0)),
    [entries]
  );

  useEffect(() => {
    const animations = animatedValues.map((animatedValue, index) =>
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 260,
        delay: index * 75,
        useNativeDriver: true,
      })
    );

    Animated.stagger(65, animations).start();
  }, [animatedValues]);

  return (
    <View style={styles.container}>
      {entries.map((entry, index) => {
        const animatedValue = animatedValues[index];
        return (
          <Animated.View
            key={`${entry.racerId}-${entry.rank}`}
            style={[
              styles.animatedWrapper,
              {
                opacity: animatedValue,
                transform: [
                  {
                    translateY: animatedValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: [14, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <RacerRowCard entry={entry} onPress={onSelectRacer} />
          </Animated.View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  animatedWrapper: {
    width: "100%",
  },
});
