import { useColorScheme } from 'react-native';

const light = {
  bg: '#edf2f5',
  surface: '#ffffff',
  ink: '#12283a',
  muted: '#627789',
  line: '#dbe4ea',
  brand: '#0e5f86',
  water: '#1d93c9',
  water2: '#8fd5f0',
  track: '#e2eaef',
  good: '#1e8a5a',
  danger: '#c0392b',
  onWater: '#ffffff',
};

const dark: typeof light = {
  bg: '#0a161e',
  surface: '#12222d',
  ink: '#e4eef4',
  muted: '#8ea4b3',
  line: '#20384a',
  brand: '#0f4966',
  water: '#33aade',
  water2: '#85d2f0',
  track: '#1d3443',
  good: '#4cc48d',
  danger: '#ff6b5b',
  onWater: '#ffffff',
};

export type Palette = typeof light;

export function useColors(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}

export const radius = { card: 14, control: 10, pill: 999 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
