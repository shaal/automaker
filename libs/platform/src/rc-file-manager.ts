/**
 * RC File Manager - Manage shell configuration files in .automaker/terminal/
 *
 * This module handles file I/O operations for generating and managing shell RC files,
 * including version checking and regeneration logic.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import type { ThemeMode } from '@automaker/types';
import {
  generateBashrc,
  generateZshrc,
  generateCommonFunctions,
  generateThemeColors,
  type TerminalConfig,
  type TerminalTheme,
} from './rc-generator.js';

/**
 * Current RC file format version
 */
export const RC_FILE_VERSION = 11;

const RC_SIGNATURE_FILENAME = 'config.sha256';

/**
 * Get the terminal directory path
 */
export function getTerminalDir(projectPath: string): string {
  return path.join(projectPath, '.automaker', 'terminal');
}

/**
 * Get the themes directory path
 */
export function getThemesDir(projectPath: string): string {
  return path.join(getTerminalDir(projectPath), 'themes');
}

/**
 * Get RC file path for specific shell
 */
export function getRcFilePath(projectPath: string, shell: 'bash' | 'zsh' | 'sh'): string {
  const terminalDir = getTerminalDir(projectPath);
  switch (shell) {
    case 'bash':
      return path.join(terminalDir, 'bashrc.sh');
    case 'zsh':
      return path.join(terminalDir, '.zshrc'); // Zsh looks for .zshrc in ZDOTDIR
    case 'sh':
      return path.join(terminalDir, 'common.sh');
  }
}

/**
 * Ensure terminal directory exists
 */
export async function ensureTerminalDir(projectPath: string): Promise<void> {
  const terminalDir = getTerminalDir(projectPath);
  const themesDir = getThemesDir(projectPath);

  await fs.mkdir(terminalDir, { recursive: true, mode: 0o755 });
  await fs.mkdir(themesDir, { recursive: true, mode: 0o755 });
}

/**
 * Write RC file with atomic write (write to temp, then rename)
 */
async function atomicWriteFile(
  filePath: string,
  content: string,
  mode: number = 0o644
): Promise<void> {
  const tempPath = `${filePath}.tmp`;
  await fs.writeFile(tempPath, content, { encoding: 'utf8', mode });
  await fs.rename(tempPath, filePath);
}

function sortObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortObjectKeys(item));
  }

  if (value && typeof value === 'object') {
    const sortedEntries = Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));

    const sortedObject: Record<string, unknown> = {};
    for (const [key, entryValue] of sortedEntries) {
      sortedObject[key] = sortObjectKeys(entryValue);
    }
    return sortedObject;
  }

  return value;
}

function buildConfigSignature(theme: ThemeMode, config: TerminalConfig): string {
  const payload = { theme, config: sortObjectKeys(config) };
  const serializedPayload = JSON.stringify(payload);
  return createHash('sha256').update(serializedPayload).digest('hex');
}

async function readSignatureFile(projectPath: string): Promise<string | null> {
  const signaturePath = path.join(getTerminalDir(projectPath), RC_SIGNATURE_FILENAME);
  try {
    const signature = await fs.readFile(signaturePath, 'utf8');
    return signature.trim() || null;
  } catch {
    return null;
  }
}

async function writeSignatureFile(projectPath: string, signature: string): Promise<void> {
  const signaturePath = path.join(getTerminalDir(projectPath), RC_SIGNATURE_FILENAME);
  await atomicWriteFile(signaturePath, `${signature}\n`, 0o644);
}

/**
 * Check current RC file version
 */
export async function checkRcFileVersion(projectPath: string): Promise<number | null> {
  const versionPath = path.join(getTerminalDir(projectPath), 'version.txt');
  try {
    const content = await fs.readFile(versionPath, 'utf8');
    const version = parseInt(content.trim(), 10);
    return isNaN(version) ? null : version;
  } catch (error) {
    return null; // File doesn't exist or can't be read
  }
}

/**
 * Write version file
 */
async function writeVersionFile(projectPath: string, version: number): Promise<void> {
  const versionPath = path.join(getTerminalDir(projectPath), 'version.txt');
  await atomicWriteFile(versionPath, `${version}\n`, 0o644);
}

/**
 * Check if RC files need regeneration
 */
export async function needsRegeneration(
  projectPath: string,
  theme: ThemeMode,
  config: TerminalConfig
): Promise<boolean> {
  const currentVersion = await checkRcFileVersion(projectPath);

  // Regenerate if version doesn't match or files don't exist
  if (currentVersion !== RC_FILE_VERSION) {
    return true;
  }

  const expectedSignature = buildConfigSignature(theme, config);
  const existingSignature = await readSignatureFile(projectPath);
  if (!existingSignature || existingSignature !== expectedSignature) {
    return true;
  }

  // Check if critical files exist
  const bashrcPath = getRcFilePath(projectPath, 'bash');
  const zshrcPath = getRcFilePath(projectPath, 'zsh');
  const commonPath = path.join(getTerminalDir(projectPath), 'common.sh');
  const themeFilePath = path.join(getThemesDir(projectPath), `${theme}.sh`);

  try {
    await Promise.all([
      fs.access(bashrcPath),
      fs.access(zshrcPath),
      fs.access(commonPath),
      fs.access(themeFilePath),
    ]);
    return false; // All files exist
  } catch {
    return true; // Some files are missing
  }
}

/**
 * Write all theme color files (all 40 themes)
 */
export async function writeAllThemeFiles(
  projectPath: string,
  terminalThemes: Record<ThemeMode, TerminalTheme>
): Promise<void> {
  const themesDir = getThemesDir(projectPath);
  await fs.mkdir(themesDir, { recursive: true, mode: 0o755 });

  const themeEntries = Object.entries(terminalThemes);
  await Promise.all(
    themeEntries.map(async ([themeName, theme]) => {
      const themeFilePath = path.join(themesDir, `${themeName}.sh`);
      const content = generateThemeColors(theme);
      await atomicWriteFile(themeFilePath, content, 0o644);
    })
  );
}

/**
 * Write a single theme color file
 */
export async function writeThemeFile(
  projectPath: string,
  theme: ThemeMode,
  themeColors: TerminalTheme
): Promise<void> {
  const themesDir = getThemesDir(projectPath);
  await fs.mkdir(themesDir, { recursive: true, mode: 0o755 });

  const themeFilePath = path.join(themesDir, `${theme}.sh`);
  const content = generateThemeColors(themeColors);
  await atomicWriteFile(themeFilePath, content, 0o644);
}

/**
 * Write all RC files
 */
export async function writeRcFiles(
  projectPath: string,
  theme: ThemeMode,
  config: TerminalConfig,
  themeColors: TerminalTheme,
  allThemes: Record<ThemeMode, TerminalTheme>
): Promise<void> {
  await ensureTerminalDir(projectPath);

  // Write common functions file
  const commonPath = path.join(getTerminalDir(projectPath), 'common.sh');
  const commonContent = generateCommonFunctions(config);
  await atomicWriteFile(commonPath, commonContent, 0o644);

  // Write bashrc
  const bashrcPath = getRcFilePath(projectPath, 'bash');
  const bashrcContent = generateBashrc(themeColors, config);
  await atomicWriteFile(bashrcPath, bashrcContent, 0o644);

  // Write zshrc
  const zshrcPath = getRcFilePath(projectPath, 'zsh');
  const zshrcContent = generateZshrc(themeColors, config);
  await atomicWriteFile(zshrcPath, zshrcContent, 0o644);

  // Write all theme files (40 themes)
  await writeAllThemeFiles(projectPath, allThemes);

  // Write version file
  await writeVersionFile(projectPath, RC_FILE_VERSION);

  // Write config signature for change detection
  const signature = buildConfigSignature(theme, config);
  await writeSignatureFile(projectPath, signature);
}

/**
 * Ensure RC files are up to date
 */
export async function ensureRcFilesUpToDate(
  projectPath: string,
  theme: ThemeMode,
  config: TerminalConfig,
  themeColors: TerminalTheme,
  allThemes: Record<ThemeMode, TerminalTheme>
): Promise<void> {
  const needsRegen = await needsRegeneration(projectPath, theme, config);
  if (needsRegen) {
    await writeRcFiles(projectPath, theme, config, themeColors, allThemes);
  }
}

/**
 * Delete terminal directory (for disable flow)
 */
export async function deleteTerminalDir(projectPath: string): Promise<void> {
  const terminalDir = getTerminalDir(projectPath);
  try {
    await fs.rm(terminalDir, { recursive: true, force: true });
  } catch (error) {
    // Ignore errors if directory doesn't exist
  }
}

/**
 * Create user-custom.sh placeholder if it doesn't exist
 */
export async function ensureUserCustomFile(projectPath: string): Promise<void> {
  const userCustomPath = path.join(getTerminalDir(projectPath), 'user-custom.sh');
  try {
    await fs.access(userCustomPath);
  } catch {
    // File doesn't exist, create it
    const content = `#!/bin/sh
# Automaker User Customizations
# Add your custom shell configuration here
# This file will not be overwritten by Automaker

# Example: Add custom aliases
# alias myalias='command'

# Example: Add custom environment variables
# export MY_VAR="value"
`;
    await atomicWriteFile(userCustomPath, content, 0o644);
  }
}
