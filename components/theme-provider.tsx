import React, { createContext, useContext, useMemo, useState } from 'react';

export type ThemeMode = 'light' | 'dark';

export type ThemeColors = {
  background: string;
  headerBackground: string;
  panel: string;
  card: string;
  cardAlt: string;
  border: string;
  text: string;
  softText: string;
  muted: string;
  gold: string;
  dark: string;
  white: string;
  green: string;
  red: string;
  orange: string;
  blue: string;
  danger: string;
};

export const accentOptions = [
  { key: 'gold', label: 'Gold', value: '#f2bc39' },
  { key: 'blue', label: 'Blue', value: '#5b9bff' },
  { key: 'green', label: 'Green', value: '#4fd18b' },
  { key: 'coral', label: 'Coral', value: '#ff7a68' },
  { key: 'purple', label: 'Purple', value: '#b98cf2' },
] as const;

export type AccentKey = (typeof accentOptions)[number]['key'];

const darkPalette: Omit<ThemeColors, 'gold'> = {
  background: '#171a1d',
  headerBackground: '#101112',
  panel: '#171b1f',
  card: '#1b1f23',
  cardAlt: '#171b1d',
  border: 'rgba(255,255,255,0.08)',
  text: '#f5f4f2',
  softText: '#d0cbc2',
  muted: '#8d8a86',
  dark: '#0b0d10',
  white: '#ffffff',
  green: '#7ae1a2',
  red: '#ff6d68',
  orange: '#ffad66',
  blue: '#82b8ff',
  danger: '#ff7a6b',
};

const lightPalette: Omit<ThemeColors, 'gold'> = {
  background: '#eef2f4',
  headerBackground: '#ffffff',
  panel: '#ffffff',
  card: '#ffffff',
  cardAlt: '#f3f6f7',
  border: 'rgba(0,0,0,0.09)',
  text: '#1c1e22',
  softText: '#454a52',
  muted: '#767b83',
  dark: '#0b0d10',
  // Doubles as "icon/text that must stand out against the page background" - white on the
  // dark theme's near-black background, and near-black on the light theme's near-white one.
  white: '#1c1e22',
  green: '#1f9c5c',
  red: '#d94c46',
  orange: '#c97a2b',
  blue: '#2f6fce',
  danger: '#d94c46',
};

// Accent swatches are bright, pastel-ish colors tuned to read as highlights against the
// dark theme's near-black surfaces. Used verbatim as small text/icon color in light mode,
// several are too light to stay readable against near-white cards, so light mode uses a
// darkened version of the chosen accent for text/icons/borders instead.
function darken(hex: string, amount: number): string {
  const normalized = hex.replace('#', '');
  const value = parseInt(normalized, 16);
  const r = Math.round(((value >> 16) & 255) * (1 - amount));
  const g = Math.round(((value >> 8) & 255) * (1 - amount));
  const b = Math.round((value & 255) * (1 - amount));
  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

function buildColors(mode: ThemeMode, accent: string): ThemeColors {
  const base = mode === 'dark' ? darkPalette : lightPalette;
  const resolvedAccent = mode === 'light' ? darken(accent, 0.25) : accent;
  return { ...base, gold: resolvedAccent };
}

// Converts a '#rrggbb' color plus an alpha into an rgba() string, so tinted card/badge
// backgrounds can follow the selected accent color instead of being stuck on gold.
export function withAlpha(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  const value = parseInt(normalized, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

type ThemeContextValue = {
  mode: ThemeMode;
  isDark: boolean;
  toggleMode: () => void;
  setMode: (mode: ThemeMode) => void;
  accentKey: AccentKey;
  setAccentKey: (key: AccentKey) => void;
  colors: ThemeColors;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Local to the session for now - see FIREBASE_SETUP.md / chat notes on persistence limits.
  const [mode, setMode] = useState<ThemeMode>('dark');
  const [accentKey, setAccentKey] = useState<AccentKey>('gold');

  const accentValue = accentOptions.find((option) => option.key === accentKey)?.value ?? accentOptions[0].value;

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      isDark: mode === 'dark',
      toggleMode: () => setMode((current) => (current === 'dark' ? 'light' : 'dark')),
      setMode,
      accentKey,
      setAccentKey,
      colors: buildColors(mode, accentValue),
    }),
    [mode, accentKey, accentValue],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useAppTheme must be used within ThemeProvider');
  }

  return context;
}

export function useThemeColors(): ThemeColors {
  return useAppTheme().colors;
}
