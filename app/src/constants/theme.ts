import { DarkTheme, DefaultTheme, type Theme as NavigationTheme } from 'expo-router';
import { useColorScheme } from 'react-native';

export type Theme = {
  background: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
  accent: string;
  danger: string;
};

const light: Theme = {
  background: '#ffffff',
  surface: '#f4f4f5',
  text: '#18181b',
  muted: '#71717a',
  border: '#e4e4e7',
  accent: '#2563eb',
  danger: '#dc2626',
};

const dark: Theme = {
  background: '#09090b',
  surface: '#18181b',
  text: '#f4f4f5',
  muted: '#a1a1aa',
  border: '#27272a',
  accent: '#60a5fa',
  danger: '#f87171',
};

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

function toNavigationTheme(theme: Theme, base: NavigationTheme): NavigationTheme {
  return {
    ...base,
    colors: {
      primary: theme.accent,
      background: theme.background,
      card: theme.background,
      text: theme.text,
      border: theme.border,
      notification: theme.danger,
    },
  };
}

const navigationLight = toNavigationTheme(light, DefaultTheme);
const navigationDark = toNavigationTheme(dark, DarkTheme);

/**
 * Theme for expo-router's ThemeProvider. Without it the native stack falls back to
 * DefaultTheme, whose light-grey background shows behind screens during push/pop
 * transitions on Android (visible as white edges / a white flash in dark mode).
 */
export function useNavigationTheme(): NavigationTheme {
  return useColorScheme() === 'dark' ? navigationDark : navigationLight;
}
