import { useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fontFamily } from "../constants/theme";
import type { AppTheme } from "../constants/theme";
import { useAppTheme } from "../theme/AppThemeProvider";

export type SelectMenuOption = {
  label: string;
  value: string;
  helper?: string;
};

type SelectMenuProps = {
  value: string;
  placeholder: string;
  title: string;
  options: SelectMenuOption[];
  onChange: (value: string) => void;
  triggerTestID: string;
  optionTestIDPrefix: string;
};

export const SelectMenu = ({
  value,
  placeholder,
  title,
  options,
  onChange,
  triggerTestID,
  optionTestIDPrefix,
}: SelectMenuProps) => {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [visible, setVisible] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value]
  );

  const isDisabled = options.length === 0;

  const openMenu = () => {
    if (isDisabled) {
      return;
    }

    setVisible(true);
    Animated.spring(animation, {
      toValue: 1,
      damping: 24,
      stiffness: 260,
      mass: 0.8,
      useNativeDriver: true,
    }).start();
  };

  const closeMenu = () => {
    Animated.timing(animation, {
      toValue: 0,
      duration: 170,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setVisible(false);
      }
    });
  };

  const selectOption = (nextValue: string) => {
    onChange(nextValue);
    closeMenu();
  };

  const triggerText = selectedOption ? selectedOption.label : placeholder;
  const isPlaceholder = !selectedOption;

  const backdropOpacity = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.28],
  });
  const panelTranslate = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [22, 0],
  });
  const panelOpacity = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1],
  });
  const chevronRotation = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });
  const panelMaxHeight = Math.max(
    280,
    Math.min(height * 0.72, height - insets.top - theme.spacing.lg)
  );

  return (
    <>
      <Pressable
        onPress={openMenu}
        style={({ pressed }) => [
          styles.trigger,
          isPlaceholder && styles.triggerPlaceholder,
          isDisabled && styles.triggerDisabled,
          pressed && !isDisabled && styles.triggerPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityHint={`Opens ${title.toLowerCase()} options`}
        accessibilityState={{ expanded: visible, disabled: isDisabled }}
        testID={triggerTestID}
      >
        <Text
          style={[styles.triggerText, isPlaceholder && styles.placeholderText]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {triggerText}
        </Text>
        <Animated.View style={{ transform: [{ rotate: chevronRotation }] }}>
          <Ionicons
            name="chevron-down"
            size={17}
            color={isDisabled ? theme.colors.menuIconDisabled : theme.colors.accent}
          />
        </Animated.View>
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeMenu}
      >
        <View style={styles.modalRoot}>
          <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={closeMenu}
            accessibilityRole="button"
            accessibilityLabel="Dismiss menu"
          />

          <Animated.View
            style={[
              styles.panel,
              {
                maxHeight: panelMaxHeight,
                paddingBottom: theme.spacing.sm + insets.bottom,
                opacity: panelOpacity,
                transform: [{ translateY: panelTranslate }],
              },
            ]}
          >
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>{title}</Text>
              <Pressable
                onPress={closeMenu}
                style={styles.closeButton}
                accessibilityRole="button"
                accessibilityLabel="Close menu"
              >
                <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
              </Pressable>
            </View>

            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              contentContainerStyle={styles.optionsContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              renderItem={({ item }) => {
                const isSelected = item.value === value;
                return (
                  <Pressable
                    onPress={() => selectOption(item.value)}
                    style={({ pressed }) => [
                      styles.optionRow,
                      isSelected && styles.optionSelected,
                      pressed && styles.optionPressed,
                    ]}
                    testID={`${optionTestIDPrefix}${item.value}`}
                  >
                    <View style={styles.optionCopy}>
                      <Text style={styles.optionLabel}>{item.label}</Text>
                      {item.helper ? <Text style={styles.optionHelper}>{item.helper}</Text> : null}
                    </View>
                    {isSelected ? (
                      <Ionicons name="checkmark" size={17} color={theme.colors.accent} />
                    ) : null}
                  </Pressable>
                );
              }}
            />
          </Animated.View>
        </View>
      </Modal>
    </>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    trigger: {
      minHeight: 50,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: theme.spacing.sm,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
      ...theme.shadows.card,
    },
    triggerPlaceholder: {
      backgroundColor: theme.colors.menuPlaceholderSurface,
      borderColor: theme.colors.menuPlaceholderBorder,
    },
    triggerDisabled: {
      opacity: 0.55,
    },
    triggerPressed: {
      opacity: 0.9,
    },
    triggerText: {
      flex: 1,
      fontFamily: fontFamily.bodySemi,
      color: theme.colors.textPrimary,
      fontSize: theme.typeScale.body,
    },
    placeholderText: {
      fontFamily: fontFamily.bodyRegular,
      color: theme.colors.textSecondary,
    },
    modalRoot: {
      flex: 1,
      justifyContent: "flex-end",
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.colors.menuBackdrop,
    },
    panel: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: theme.radius.lg,
      borderTopRightRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingBottom: theme.spacing.sm,
    },
    panelHeader: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    panelTitle: {
      fontFamily: fontFamily.headingSemi,
      color: theme.colors.textPrimary,
      fontSize: theme.typeScale.h3,
    },
    closeButton: {
      width: 28,
      height: 28,
      borderRadius: 28,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surfaceMuted,
    },
    optionsContent: {
      padding: theme.spacing.sm,
    },
    separator: {
      height: theme.spacing.xs,
    },
    optionRow: {
      minHeight: 48,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
    },
    optionSelected: {
      borderColor: theme.colors.accent,
      backgroundColor: theme.colors.accentSoft,
    },
    optionPressed: {
      opacity: 0.86,
    },
    optionCopy: {
      flex: 1,
      gap: 2,
    },
    optionLabel: {
      fontFamily: fontFamily.bodySemi,
      color: theme.colors.textPrimary,
      fontSize: theme.typeScale.body,
    },
    optionHelper: {
      fontFamily: fontFamily.bodyRegular,
      color: theme.colors.textSecondary,
      fontSize: theme.typeScale.caption,
    },
  });
