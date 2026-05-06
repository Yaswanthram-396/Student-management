import { TextStyle } from 'react-native';

export const typography: Record<string, TextStyle> = {
  display: {
    fontSize: 28,
    fontWeight: '600',
  },
  h1: {
    fontSize: 22,
    fontWeight: '600',
  },
  h2: {
    fontSize: 18,
    fontWeight: '500',
  },
  h3: {
    fontSize: 15,
    fontWeight: '500',
  },
  body: {
    fontSize: 14,
    fontWeight: '400',
  },
  caption: {
    fontSize: 12,
    fontWeight: '400',
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
};

export type TypographyKey = keyof typeof typography;
