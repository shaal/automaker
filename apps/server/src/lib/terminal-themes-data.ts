/**
 * Terminal Theme Data - Re-export terminal themes from platform package
 *
 * This module re-exports terminal theme data for use in the server.
 */

import { terminalThemeColors, getTerminalThemeColors as getThemeColors } from '@automaker/platform';
import type { ThemeMode } from '@automaker/types';
import type { TerminalTheme } from '@automaker/platform';

/**
 * Get terminal theme colors for a given theme mode
 */
export function getTerminalThemeColors(theme: ThemeMode): TerminalTheme {
  return getThemeColors(theme);
}

/**
 * Get all terminal themes
 */
export function getAllTerminalThemes(): Record<ThemeMode, TerminalTheme> {
  return terminalThemeColors;
}

export default terminalThemeColors;
