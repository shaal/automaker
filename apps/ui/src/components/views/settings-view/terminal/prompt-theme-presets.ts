import type { TerminalPromptTheme } from '@automaker/types';

export const PROMPT_THEME_CUSTOM_ID: TerminalPromptTheme = 'custom';

export const OMP_THEME_NAMES = [
  '1_shell',
  'M365Princess',
  'agnoster',
  'agnoster.minimal',
  'agnosterplus',
  'aliens',
  'amro',
  'atomic',
  'atomicBit',
  'avit',
  'blue-owl',
  'blueish',
  'bubbles',
  'bubblesextra',
  'bubblesline',
  'capr4n',
  'catppuccin',
  'catppuccin_frappe',
  'catppuccin_latte',
  'catppuccin_macchiato',
  'catppuccin_mocha',
  'cert',
  'chips',
  'cinnamon',
  'clean-detailed',
  'cloud-context',
  'cloud-native-azure',
  'cobalt2',
  'craver',
  'darkblood',
  'devious-diamonds',
  'di4am0nd',
  'dracula',
  'easy-term',
  'emodipt',
  'emodipt-extend',
  'fish',
  'free-ukraine',
  'froczh',
  'gmay',
  'glowsticks',
  'grandpa-style',
  'gruvbox',
  'half-life',
  'honukai',
  'hotstick.minimal',
  'hul10',
  'hunk',
  'huvix',
  'if_tea',
  'illusi0n',
  'iterm2',
  'jandedobbeleer',
  'jblab_2021',
  'jonnychipz',
  'json',
  'jtracey93',
  'jv_sitecorian',
  'kali',
  'kushal',
  'lambda',
  'lambdageneration',
  'larserikfinholt',
  'lightgreen',
  'marcduiker',
  'markbull',
  'material',
  'microverse-power',
  'mojada',
  'montys',
  'mt',
  'multiverse-neon',
  'negligible',
  'neko',
  'night-owl',
  'nordtron',
  'nu4a',
  'onehalf.minimal',
  'paradox',
  'pararussel',
  'patriksvensson',
  'peru',
  'pixelrobots',
  'plague',
  'poshmon',
  'powerlevel10k_classic',
  'powerlevel10k_lean',
  'powerlevel10k_modern',
  'powerlevel10k_rainbow',
  'powerline',
  'probua.minimal',
  'pure',
  'quick-term',
  'remk',
  'robbyrussell',
  'rudolfs-dark',
  'rudolfs-light',
  'sim-web',
  'slim',
  'slimfat',
  'smoothie',
  'sonicboom_dark',
  'sonicboom_light',
  'sorin',
  'space',
  'spaceship',
  'star',
  'stelbent-compact.minimal',
  'stelbent.minimal',
  'takuya',
  'the-unnamed',
  'thecyberden',
  'tiwahu',
  'tokyo',
  'tokyonight_storm',
  'tonybaloney',
  'uew',
  'unicorn',
  'velvet',
  'wholespace',
  'wopian',
  'xtoys',
  'ys',
  'zash',
] as const;

type OmpThemeName = (typeof OMP_THEME_NAMES)[number];

type PromptFormat = 'standard' | 'minimal' | 'powerline' | 'starship';

type PathStyle = 'full' | 'short' | 'basename';

export interface PromptThemeConfig {
  promptFormat: PromptFormat;
  showGitBranch: boolean;
  showGitStatus: boolean;
  showUserHost: boolean;
  showPath: boolean;
  pathStyle: PathStyle;
  pathDepth: number;
  showTime: boolean;
  showExitStatus: boolean;
}

export interface PromptThemePreset {
  id: TerminalPromptTheme;
  label: string;
  description: string;
  config: PromptThemeConfig;
}

const PATH_DEPTH_FULL = 0;
const PATH_DEPTH_TWO = 2;
const PATH_DEPTH_THREE = 3;

const POWERLINE_HINTS = ['powerline', 'powerlevel10k', 'agnoster', 'bubbles', 'smoothie'];
const MINIMAL_HINTS = ['minimal', 'pure', 'slim', 'negligible'];
const STARSHIP_HINTS = ['spaceship', 'star'];
const SHORT_PATH_HINTS = ['compact', 'lean', 'slim'];
const TIME_HINTS = ['time', 'clock'];
const EXIT_STATUS_HINTS = ['status', 'exit', 'fail', 'error'];

function toPromptThemeId(name: OmpThemeName): TerminalPromptTheme {
  return `omp-${name}` as TerminalPromptTheme;
}

function formatLabel(name: string): string {
  const cleaned = name.replace(/[._-]+/g, ' ').trim();
  return cleaned
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildPresetConfig(name: OmpThemeName): PromptThemeConfig {
  const lower = name.toLowerCase();
  const isPowerline = POWERLINE_HINTS.some((hint) => lower.includes(hint));
  const isMinimal = MINIMAL_HINTS.some((hint) => lower.includes(hint));
  const isStarship = STARSHIP_HINTS.some((hint) => lower.includes(hint));
  let promptFormat: PromptFormat = 'standard';

  if (isPowerline) {
    promptFormat = 'powerline';
  } else if (isMinimal) {
    promptFormat = 'minimal';
  } else if (isStarship) {
    promptFormat = 'starship';
  }

  const showUserHost = !isMinimal;
  const showPath = true;
  const pathStyle: PathStyle = isMinimal ? 'short' : 'full';
  let pathDepth = isMinimal ? PATH_DEPTH_THREE : PATH_DEPTH_FULL;

  if (SHORT_PATH_HINTS.some((hint) => lower.includes(hint))) {
    pathDepth = PATH_DEPTH_TWO;
  }

  if (lower.includes('powerlevel10k')) {
    pathDepth = PATH_DEPTH_THREE;
  }

  const showTime = TIME_HINTS.some((hint) => lower.includes(hint));
  const showExitStatus = EXIT_STATUS_HINTS.some((hint) => lower.includes(hint));

  return {
    promptFormat,
    showGitBranch: true,
    showGitStatus: true,
    showUserHost,
    showPath,
    pathStyle,
    pathDepth,
    showTime,
    showExitStatus,
  };
}

export const PROMPT_THEME_PRESETS: PromptThemePreset[] = OMP_THEME_NAMES.map((name) => ({
  id: toPromptThemeId(name),
  label: `${formatLabel(name)} (OMP)`,
  description: 'Oh My Posh theme preset',
  config: buildPresetConfig(name),
}));

export function getPromptThemePreset(presetId: TerminalPromptTheme): PromptThemePreset | null {
  return PROMPT_THEME_PRESETS.find((preset) => preset.id === presetId) ?? null;
}

export function getMatchingPromptThemeId(config: PromptThemeConfig): TerminalPromptTheme {
  const match = PROMPT_THEME_PRESETS.find((preset) => {
    const presetConfig = preset.config;
    return (
      presetConfig.promptFormat === config.promptFormat &&
      presetConfig.showGitBranch === config.showGitBranch &&
      presetConfig.showGitStatus === config.showGitStatus &&
      presetConfig.showUserHost === config.showUserHost &&
      presetConfig.showPath === config.showPath &&
      presetConfig.pathStyle === config.pathStyle &&
      presetConfig.pathDepth === config.pathDepth &&
      presetConfig.showTime === config.showTime &&
      presetConfig.showExitStatus === config.showExitStatus
    );
  });

  return match?.id ?? PROMPT_THEME_CUSTOM_ID;
}
