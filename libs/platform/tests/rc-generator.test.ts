import { describe, it, expect } from 'vitest';
import { generateCommonFunctions, generateThemeColors } from '../src/rc-generator';
import { terminalThemeColors } from '../src/terminal-theme-colors';
import type { TerminalConfig } from '../src/rc-generator';
import type { ThemeMode } from '@automaker/types';

describe('rc-generator.ts', () => {
  const THEME_DARK = 'dark' as ThemeMode;
  const PROMPT_FORMAT_STANDARD: TerminalConfig['promptFormat'] = 'standard';
  const EMPTY_ALIASES = '';
  const EMPTY_ENV_VARS = {};
  const PATH_STYLE_FULL: TerminalConfig['pathStyle'] = 'full';
  const PATH_DEPTH_DEFAULT = 0;
  const EXPECTED_BANNER_FUNCTION = 'automaker_show_banner_once';
  const RAW_COLOR_PREFIX = 'export COLOR_USER_RAW=';
  const RAW_COLOR_ESCAPE_START = '\\\\[';
  const RAW_COLOR_ESCAPE_END = '\\\\]';
  const STARTUP_PRIMARY_COLOR = '38;5;51m';
  const STARTUP_SECONDARY_COLOR = '38;5;39m';
  const STARTUP_ACCENT_COLOR = '38;5;33m';

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
    customEnvVars: EMPTY_ENV_VARS,
  };

  it('includes banner functions in common shell script', () => {
    const output = generateCommonFunctions(baseConfig);

    expect(output).toContain(EXPECTED_BANNER_FUNCTION);
    expect(output).toContain(STARTUP_PRIMARY_COLOR);
    expect(output).toContain(STARTUP_SECONDARY_COLOR);
    expect(output).toContain(STARTUP_ACCENT_COLOR);
  });

  it('exports raw banner colors without prompt escape wrappers', () => {
    const output = generateThemeColors(terminalThemeColors[THEME_DARK]);
    const rawLine = output.split('\n').find((line) => line.startsWith(RAW_COLOR_PREFIX));

    expect(rawLine).toBeDefined();
    expect(rawLine).not.toContain(RAW_COLOR_ESCAPE_START);
    expect(rawLine).not.toContain(RAW_COLOR_ESCAPE_END);
  });
});
