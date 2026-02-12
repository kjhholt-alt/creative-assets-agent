// ============================================
// THEME DEFINITIONS — Colors, fonts, and visual identity per theme
// ============================================

import type { AssetTheme } from "../types.js";

export interface ThemeConfig {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textMuted: string;
    border: string;
  };
  fonts: {
    heading: string;
    headingWeight: string;
    body: string;
    bodyWeight: string;
    mono: string;
  };
  style: {
    borderRadius: string;
    shadowIntensity: "none" | "subtle" | "medium" | "dramatic";
    gradientDirection: string;
    noiseOverlay: boolean;
    glowEffects: boolean;
  };
  imagePromptModifiers: string; // Appended to all Replicate prompts for consistency
}

export const THEMES: Record<AssetTheme, ThemeConfig> = {
  dark: {
    name: "Dark Mode",
    colors: {
      primary: "#6366F1",
      secondary: "#8B5CF6",
      accent: "#22D3EE",
      background: "#0F0F14",
      surface: "#1A1A24",
      text: "#F1F5F9",
      textMuted: "#94A3B8",
      border: "#2D2D3A",
    },
    fonts: {
      heading: "JetBrains Mono",
      headingWeight: "700",
      body: "DM Sans",
      bodyWeight: "400",
      mono: "JetBrains Mono",
    },
    style: {
      borderRadius: "12px",
      shadowIntensity: "dramatic",
      gradientDirection: "135deg",
      noiseOverlay: true,
      glowEffects: true,
    },
    imagePromptModifiers:
      "dark background, moody lighting, deep shadows, neon accents, professional, high contrast",
  },

  light: {
    name: "Clean Light",
    colors: {
      primary: "#2563EB",
      secondary: "#7C3AED",
      accent: "#F59E0B",
      background: "#FAFBFC",
      surface: "#FFFFFF",
      text: "#0F172A",
      textMuted: "#64748B",
      border: "#E2E8F0",
    },
    fonts: {
      heading: "Outfit",
      headingWeight: "700",
      body: "Plus Jakarta Sans",
      bodyWeight: "400",
      mono: "Fira Code",
    },
    style: {
      borderRadius: "16px",
      shadowIntensity: "subtle",
      gradientDirection: "180deg",
      noiseOverlay: false,
      glowEffects: false,
    },
    imagePromptModifiers:
      "clean white background, bright lighting, minimal shadows, professional, airy, modern",
  },

  terminal: {
    name: "Terminal / Hacker",
    colors: {
      primary: "#00FF41",
      secondary: "#39FF14",
      accent: "#FF6600",
      background: "#0D0208",
      surface: "#111611",
      text: "#00FF41",
      textMuted: "#008F26",
      border: "#1A3A1A",
    },
    fonts: {
      heading: "Share Tech Mono",
      headingWeight: "400",
      body: "IBM Plex Mono",
      bodyWeight: "400",
      mono: "IBM Plex Mono",
    },
    style: {
      borderRadius: "0px",
      shadowIntensity: "none",
      gradientDirection: "180deg",
      noiseOverlay: true,
      glowEffects: true,
    },
    imagePromptModifiers:
      "CRT screen aesthetic, green phosphor glow, scanlines, matrix-style, retro terminal, dark background",
  },

  gradient: {
    name: "Vivid Gradient",
    colors: {
      primary: "#7C3AED",
      secondary: "#EC4899",
      accent: "#06B6D4",
      background: "#0F0720",
      surface: "#1A1040",
      text: "#F8FAFC",
      textMuted: "#C4B5FD",
      border: "#3B2870",
    },
    fonts: {
      heading: "Space Grotesk",
      headingWeight: "700",
      body: "Nunito Sans",
      bodyWeight: "400",
      mono: "JetBrains Mono",
    },
    style: {
      borderRadius: "20px",
      shadowIntensity: "dramatic",
      gradientDirection: "135deg",
      noiseOverlay: false,
      glowEffects: true,
    },
    imagePromptModifiers:
      "vibrant gradient background, purple to pink, cosmic, ethereal, futuristic, high saturation",
  },

  minimal: {
    name: "Minimalist",
    colors: {
      primary: "#171717",
      secondary: "#404040",
      accent: "#DC2626",
      background: "#FFFFFF",
      surface: "#FAFAFA",
      text: "#171717",
      textMuted: "#737373",
      border: "#E5E5E5",
    },
    fonts: {
      heading: "Instrument Serif",
      headingWeight: "400",
      body: "Inter",
      bodyWeight: "400",
      mono: "Berkeley Mono",
    },
    style: {
      borderRadius: "4px",
      shadowIntensity: "none",
      gradientDirection: "180deg",
      noiseOverlay: false,
      glowEffects: false,
    },
    imagePromptModifiers:
      "minimal, lots of whitespace, clean typography, editorial, restrained, elegant",
  },

  brutalist: {
    name: "Brutalist",
    colors: {
      primary: "#000000",
      secondary: "#FF0000",
      accent: "#FFFF00",
      background: "#F5F5DC",
      surface: "#FFFFFF",
      text: "#000000",
      textMuted: "#666666",
      border: "#000000",
    },
    fonts: {
      heading: "Anton",
      headingWeight: "400",
      body: "Courier Prime",
      bodyWeight: "400",
      mono: "Courier Prime",
    },
    style: {
      borderRadius: "0px",
      shadowIntensity: "dramatic",
      gradientDirection: "0deg",
      noiseOverlay: false,
      glowEffects: false,
    },
    imagePromptModifiers:
      "brutalist design, raw concrete, bold typography, high contrast, punk aesthetic, unpolished",
  },

  retro: {
    name: "Retro 80s/90s",
    colors: {
      primary: "#FF6B9D",
      secondary: "#C44DFF",
      accent: "#00F5D4",
      background: "#1A0A2E",
      surface: "#2D1B69",
      text: "#FEE2F8",
      textMuted: "#B794F6",
      border: "#6B21A8",
    },
    fonts: {
      heading: "Press Start 2P",
      headingWeight: "400",
      body: "VT323",
      bodyWeight: "400",
      mono: "VT323",
    },
    style: {
      borderRadius: "0px",
      shadowIntensity: "dramatic",
      gradientDirection: "45deg",
      noiseOverlay: true,
      glowEffects: true,
    },
    imagePromptModifiers:
      "synthwave, retrowave, 80s neon, chrome text, palm trees, sunset gradient, VHS aesthetic",
  },

  neon: {
    name: "Neon Cyberpunk",
    colors: {
      primary: "#FF00FF",
      secondary: "#00FFFF",
      accent: "#FFFF00",
      background: "#030014",
      surface: "#0A0A2E",
      text: "#FFFFFF",
      textMuted: "#9D4EDD",
      border: "#4A0E78",
    },
    fonts: {
      heading: "Orbitron",
      headingWeight: "700",
      body: "Rajdhani",
      bodyWeight: "500",
      mono: "Share Tech Mono",
    },
    style: {
      borderRadius: "8px",
      shadowIntensity: "dramatic",
      gradientDirection: "135deg",
      noiseOverlay: true,
      glowEffects: true,
    },
    imagePromptModifiers:
      "cyberpunk, neon lights, rain-slicked streets, holographic, futuristic UI, electric glow",
  },

  organic: {
    name: "Organic / Natural",
    colors: {
      primary: "#2D5016",
      secondary: "#8B7355",
      accent: "#D4A574",
      background: "#F5F0E8",
      surface: "#FDFBF7",
      text: "#2C1810",
      textMuted: "#6B5B4A",
      border: "#D4C5B0",
    },
    fonts: {
      heading: "Playfair Display",
      headingWeight: "700",
      body: "Source Serif 4",
      bodyWeight: "400",
      mono: "Fira Code",
    },
    style: {
      borderRadius: "24px",
      shadowIntensity: "subtle",
      gradientDirection: "180deg",
      noiseOverlay: false,
      glowEffects: false,
    },
    imagePromptModifiers:
      "natural textures, warm earth tones, botanical, handcrafted feel, paper texture, organic shapes",
  },

  custom: {
    name: "Custom",
    colors: {
      primary: "#6366F1",
      secondary: "#8B5CF6",
      accent: "#22D3EE",
      background: "#0F0F14",
      surface: "#1A1A24",
      text: "#F1F5F9",
      textMuted: "#94A3B8",
      border: "#2D2D3A",
    },
    fonts: {
      heading: "DM Sans",
      headingWeight: "700",
      body: "DM Sans",
      bodyWeight: "400",
      mono: "JetBrains Mono",
    },
    style: {
      borderRadius: "12px",
      shadowIntensity: "medium",
      gradientDirection: "135deg",
      noiseOverlay: false,
      glowEffects: false,
    },
    imagePromptModifiers: "professional, modern, clean",
  },
};

export function getTheme(theme: AssetTheme): ThemeConfig {
  return THEMES[theme] || THEMES.dark;
}

/**
 * Merge custom colors/fonts into a theme config
 */
export function mergeCustomTheme(
  base: ThemeConfig,
  customColors?: Partial<ThemeConfig["colors"]>,
  customFonts?: Partial<ThemeConfig["fonts"]>
): ThemeConfig {
  return {
    ...base,
    colors: { ...base.colors, ...customColors },
    fonts: { ...base.fonts, ...customFonts },
  };
}
