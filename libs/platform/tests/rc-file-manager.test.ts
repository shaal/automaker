import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { needsRegeneration, writeRcFiles } from '../src/rc-file-manager';
import { terminalThemeColors } from '../src/terminal-theme-colors';
import type { TerminalConfig } from '../src/rc-generator';
import type { ThemeMode } from '@automaker/types';

describe('rc-file-manager.ts', () => {
  let tempDir: string;
  let projectPath: string;

  const TEMP_DIR_PREFIX = 'platform-rc-files-test-';
  const PROJECT_DIR_NAME = 'test-project';
  const THEME_DARK = 'dark' as ThemeMode;
  const THEME_LIGHT = 'light' as ThemeMode;
  const PROMPT_FORMAT_STANDARD: TerminalConfig['promptFormat'] = 'standard';
  const PROMPT_FORMAT_MINIMAL: TerminalConfig['promptFormat'] = 'minimal';
  const EMPTY_ALIASES = '';
  const PATH_STYLE_FULL: TerminalConfig['pathStyle'] = 'full';
  const PATH_DEPTH_DEFAULT = 0;

  const baseConfig: TerminalConfig = {
    enabled: true,
    customPrompt: true,
    promptFormat: PROMPT_FORMAT_STANDARD,
    showGitBranch: true,
    showGitStatus: true,
    showUserHost: true,
    showPath: true,
    pathStyle: PATH_STYLE_FULL,
    pathDepth: PATH_DEPTH_DEFAULT,
    showTime: false,
    showExitStatus: false,
    customAliases: EMPTY_ALIASES,
    customEnvVars: {},
  };

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), TEMP_DIR_PREFIX));
    projectPath = path.join(tempDir, PROJECT_DIR_NAME);
    await fs.mkdir(projectPath, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should not regenerate when signature matches', async () => {
    await writeRcFiles(
      projectPath,
      THEME_DARK,
      baseConfig,
      terminalThemeColors[THEME_DARK],
      terminalThemeColors
    );

    const needsRegen = await needsRegeneration(projectPath, THEME_DARK, baseConfig);

    expect(needsRegen).toBe(false);
  });

  it('should regenerate when config changes', async () => {
    await writeRcFiles(
      projectPath,
      THEME_DARK,
      baseConfig,
      terminalThemeColors[THEME_DARK],
      terminalThemeColors
    );

    const updatedConfig: TerminalConfig = {
      ...baseConfig,
      promptFormat: PROMPT_FORMAT_MINIMAL,
    };

    const needsRegen = await needsRegeneration(projectPath, THEME_DARK, updatedConfig);

    expect(needsRegen).toBe(true);
  });

  it('should regenerate when theme changes', async () => {
    await writeRcFiles(
      projectPath,
      THEME_DARK,
      baseConfig,
      terminalThemeColors[THEME_DARK],
      terminalThemeColors
    );

    const needsRegen = await needsRegeneration(projectPath, THEME_LIGHT, baseConfig);

    expect(needsRegen).toBe(true);
  });
});
