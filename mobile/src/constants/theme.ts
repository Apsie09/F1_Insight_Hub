export type ThemeMode = "light" | "dark";

const sharedTheme = {
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
    headingBold: "SourceSans3_700Bold",
    headingSemi: "SourceSans3_600SemiBold",
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

type ColorTokens = {
  background: string;
  surface: string;
  surfaceMuted: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  accentSoft: string;
  border: string;
  success: string;
  warning: string;
  error: string;
  heroSurface: string;
  heroTag: string;
  heroSubtitle: string;
  heroShapeLarge: string;
  heroShapeSmall: string;
  secondaryBorder: string;
  raceHeroSurface: string;
  raceHeroSubtitle: string;
  raceHeroMeta: string;
  menuPlaceholderSurface: string;
  menuPlaceholderBorder: string;
  menuBackdrop: string;
  menuIconDisabled: string;
  errorSurface: string;
  errorBorder: string;
};

const lightColors: ColorTokens = {
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
  heroSurface: "#1A1F2D",
  heroTag: "#F7B4BF",
  heroSubtitle: "#D8DEEA",
  heroShapeLarge: "rgba(210, 14, 42, 0.2)",
  heroShapeSmall: "rgba(255, 255, 255, 0.08)",
  secondaryBorder: "#5B667E",
  raceHeroSurface: "#1C2335",
  raceHeroSubtitle: "#F2B8C1",
  raceHeroMeta: "#D8DFE8",
  menuPlaceholderSurface: "#F8FAFD",
  menuPlaceholderBorder: "#C7CFDD",
  menuBackdrop: "#121724",
  menuIconDisabled: "#94A0B5",
  errorSurface: "#FFF4F2",
  errorBorder: "#F6C0B4",
};

const darkColors: ColorTokens = {
  background: "#0C111B",
  surface: "#131A27",
  surfaceMuted: "#1C2536",
  textPrimary: "#EDF2FB",
  textSecondary: "#A5B1C6",
  accent: "#FF4A66",
  accentSoft: "#3C1720",
  border: "#2A354B",
  success: "#30C587",
  warning: "#E8B645",
  error: "#FF7B70",
  heroSurface: "#101726",
  heroTag: "#FFB8C7",
  heroSubtitle: "#C6D1E6",
  heroShapeLarge: "rgba(255, 74, 102, 0.28)",
  heroShapeSmall: "rgba(255, 255, 255, 0.08)",
  secondaryBorder: "#62728F",
  raceHeroSurface: "#111A2B",
  raceHeroSubtitle: "#F0C3CB",
  raceHeroMeta: "#D3DDEE",
  menuPlaceholderSurface: "#1A2435",
  menuPlaceholderBorder: "#364761",
  menuBackdrop: "#04070D",
  menuIconDisabled: "#7F8DA5",
  errorSurface: "#381B1B",
  errorBorder: "#7E3732",
};

export const lightTheme = {
  mode: "light" as ThemeMode,
  dark: false,
  ...sharedTheme,
  colors: lightColors,
};

export const darkTheme = {
  mode: "dark" as ThemeMode,
  dark: true,
  ...sharedTheme,
  colors: darkColors,
};

export const defaultTheme = lightTheme;

export type AppTheme = typeof lightTheme;

export const fontFamily = {
  headingBold: sharedTheme.fonts.headingBold,
  headingSemi: sharedTheme.fonts.headingSemi,
  bodyRegular: sharedTheme.fonts.bodyRegular,
  bodySemi: sharedTheme.fonts.bodySemi,
  bodyBold: sharedTheme.fonts.bodyBold,
};
