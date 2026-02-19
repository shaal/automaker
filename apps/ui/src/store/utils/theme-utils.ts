import { getItem, setItem, removeItem } from '@/lib/storage';
import { DEFAULT_FONT_VALUE } from '@/config/ui-font-options';
import type { Project } from '@/lib/electron';
import type { ThemeMode } from '../types/ui-types';

// LocalStorage keys for persistence (fallback when server settings aren't available)
export const THEME_STORAGE_KEY = 'automaker:theme';
const FONT_SANS_STORAGE_KEY = 'automaker:font-sans';
const FONT_MONO_STORAGE_KEY = 'automaker:font-mono';

/**
 * Get the theme from localStorage as a fallback
 * Used before server settings are loaded (e.g., on login/setup pages)
 */
export function getStoredTheme(): ThemeMode | null {
  const stored = getItem(THEME_STORAGE_KEY);
  if (stored) return stored as ThemeMode;

  // Backwards compatibility: older versions stored theme inside the Zustand persist blob.
  // We intentionally keep reading it as a fallback so users don't get a "default theme flash"
  // on login/logged-out pages if THEME_STORAGE_KEY hasn't been written yet.
  try {
    const legacy = getItem('automaker-storage');
    if (!legacy) return null;
    interface LegacyStorageFormat {
      state?: { theme?: string };
      theme?: string;
    }
    const parsed = JSON.parse(legacy) as LegacyStorageFormat;
    const theme = parsed.state?.theme ?? parsed.theme;
    if (typeof theme === 'string' && theme.length > 0) {
      return theme as ThemeMode;
    }
  } catch {
    // Ignore legacy parse errors
  }

  return null;
}

/**
 * Helper to get effective font value with validation
 * Returns the font to use (project override -> global -> null for default)
 * @param projectFont - The project-specific font override
 * @param globalFont - The global font setting
 * @param fontOptions - The list of valid font options for validation
 */
export function getEffectiveFont(
  projectFont: string | undefined,
  globalFont: string | null,
  fontOptions: readonly { value: string; label: string }[]
): string | null {
  const isValidFont = (font: string | null | undefined): boolean => {
    if (!font || font === DEFAULT_FONT_VALUE) return true;
    return fontOptions.some((opt) => opt.value === font);
  };

  if (projectFont) {
    if (isValidFont(projectFont)) {
      return projectFont === DEFAULT_FONT_VALUE ? null : projectFont;
    }
    // Invalid project font -> fall through to check global font
  }
  if (!isValidFont(globalFont)) return null; // Fallback to default if font not in list
  return globalFont === DEFAULT_FONT_VALUE ? null : globalFont;
}

/**
 * Save theme to localStorage for immediate persistence
 * This is used as a fallback when server settings can't be loaded
 */
export function saveThemeToStorage(theme: ThemeMode): void {
  setItem(THEME_STORAGE_KEY, theme);
}

/**
 * Get fonts from localStorage as a fallback
 * Used before server settings are loaded (e.g., on login/setup pages)
 */
export function getStoredFontSans(): string | null {
  return getItem(FONT_SANS_STORAGE_KEY);
}

export function getStoredFontMono(): string | null {
  return getItem(FONT_MONO_STORAGE_KEY);
}

/**
 * Save fonts to localStorage for immediate persistence
 * This is used as a fallback when server settings can't be loaded
 */
export function saveFontSansToStorage(fontFamily: string | null): void {
  if (fontFamily) {
    setItem(FONT_SANS_STORAGE_KEY, fontFamily);
  } else {
    // Remove from storage if null (using default)
    removeItem(FONT_SANS_STORAGE_KEY);
  }
}

export function saveFontMonoToStorage(fontFamily: string | null): void {
  if (fontFamily) {
    setItem(FONT_MONO_STORAGE_KEY, fontFamily);
  } else {
    // Remove from storage if null (using default)
    removeItem(FONT_MONO_STORAGE_KEY);
  }
}

export function persistEffectiveThemeForProject(
  project: Project | null,
  fallbackTheme: ThemeMode
): void {
  const projectTheme = project?.theme as ThemeMode | undefined;
  const themeToStore = projectTheme ?? fallbackTheme;
  saveThemeToStorage(themeToStore);
}
