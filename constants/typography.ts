import { TextStyle } from "react-native";

export const typography: Record<string, TextStyle> = {
  display: {
    fontSize: 24,
    fontWeight: "700",
  },
  h1: {
    fontSize: 20,
    fontWeight: "600",
  },
  h2: {
    fontSize: 16,
    fontWeight: "600",
  },
  h3: {
    fontSize: 14,
    fontWeight: "500",
  },
  body: {
    fontSize: 14,
    fontWeight: "400",
  },
  caption: {
    fontSize: 12,
    fontWeight: "400",
  },
  label: {
    fontSize: 11,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 1.4,
  },
};

export type TypographyKey = keyof typeof typography;
