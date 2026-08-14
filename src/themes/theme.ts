import { darkColors, lightColors } from "./colors";
import { radius } from "./radius";
import { spacing } from "./spacing";

export type ResolvedTheme = 'light' | 'dark';

export const lightTheme = {
  color: lightColors,
  spacing,
  radius
} as const;

export const darkTheme = {
  color: darkColors,
  spacing,
  radius
} as const;