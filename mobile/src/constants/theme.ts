export const theme = {
  colors: {
    background: "#F6F8FB",
    surface: "#FFFFFF",
    surfaceMuted: "#EEF1F5",
    textPrimary: "#121724",
    textSecondary: "#4B5568",
    accent: "#D20E2A",
    accentSoft: "#FDE7EB",
    border: "#D7DEE8",
    success: "#1A9D61",
    warning: "#B27B00",
    error: "#C13515",
  },
  spacing: {
    xxs: 4,
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 28,
    xxl: 36,
  },
  radius: {
    sm: 10,
    md: 14,
    lg: 18,
    pill: 999,
  },
  shadows: {
    card: {
      shadowColor: "#121724",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 10,
      elevation: 2,
    },
  },
  fonts: {
    headingBold: "BarlowCondensed_700Bold",
    headingSemi: "BarlowCondensed_600SemiBold",
    bodyRegular: "SourceSans3_400Regular",
    bodySemi: "SourceSans3_600SemiBold",
    bodyBold: "SourceSans3_700Bold",
    fallback: "System",
  },
  typeScale: {
    hero: 44,
    h1: 32,
    h2: 24,
    h3: 20,
    body: 16,
    bodySmall: 14,
    caption: 12,
  },
} as const;

export const fontFamily = {
  headingBold: theme.fonts.headingBold,
  headingSemi: theme.fonts.headingSemi,
  bodyRegular: theme.fonts.bodyRegular,
  bodySemi: theme.fonts.bodySemi,
  bodyBold: theme.fonts.bodyBold,
};
