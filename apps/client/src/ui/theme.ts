import { useColorScheme } from 'react-native';

const palettes = {
  light: {
    background: '#FFFFFF',
    surface: '#F4F6F8',
    text: '#111827',
    textMuted: '#4B5563',
    border: '#9CA3AF',
    primary: '#1D4ED8',
    onPrimary: '#FFFFFF',
    danger: '#B91C1C',
    success: '#15803D',
  },
  dark: {
    background: '#0B0F14',
    surface: '#161B22',
    text: '#F3F4F6',
    textMuted: '#9CA3AF',
    border: '#4B5563',
    primary: '#60A5FA',
    onPrimary: '#0B0F14',
    danger: '#F87171',
    success: '#4ADE80',
  },
} as const;

export type Palette = (typeof palettes)[keyof typeof palettes];

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
export const radius = { md: 8 } as const;
export const fontSize = { body: 16, title: 24, caption: 14 } as const;
export const MAX_CONTENT_WIDTH = 420;

export function usePalette(): Palette {
  return useColorScheme() === 'dark' ? palettes.dark : palettes.light;
}
