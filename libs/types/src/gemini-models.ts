/**
 * Gemini CLI Model Definitions
 *
 * Defines available models for Gemini CLI integration.
 * Based on https://github.com/google-gemini/gemini-cli
 */

/**
 * Gemini model configuration
 */
export interface GeminiModelConfig {
  label: string;
  description: string;
  supportsVision: boolean;
  supportsThinking: boolean;
  contextWindow?: number;
}

/**
 * Available Gemini models via the Gemini CLI
 * Models from Gemini 2.5 and 3.0 series
 *
 * Model IDs use 'gemini-' prefix for consistent provider routing (like Cursor).
 * When passed to the CLI, the prefix is part of the actual model name.
 */
export const GEMINI_MODEL_MAP = {
  // Gemini 3 Series (latest)
  'gemini-3-pro-preview': {
    label: 'Gemini 3 Pro Preview',
    description: 'Most advanced Gemini model with deep reasoning capabilities.',
    supportsVision: true,
    supportsThinking: true,
    contextWindow: 1000000,
  },
  'gemini-3-flash-preview': {
    label: 'Gemini 3 Flash Preview',
    description: 'Fast Gemini 3 model for quick tasks.',
    supportsVision: true,
    supportsThinking: true,
    contextWindow: 1000000,
  },
  // Gemini 2.5 Series
  'gemini-2.5-pro': {
    label: 'Gemini 2.5 Pro',
    description: 'Advanced model with strong reasoning and 1M context.',
    supportsVision: true,
    supportsThinking: true,
    contextWindow: 1000000,
  },
  'gemini-2.5-flash': {
    label: 'Gemini 2.5 Flash',
    description: 'Balanced speed and capability for most tasks.',
    supportsVision: true,
    supportsThinking: true,
    contextWindow: 1000000,
  },
  'gemini-2.5-flash-lite': {
    label: 'Gemini 2.5 Flash Lite',
    description: 'Fastest Gemini model for simple tasks.',
    supportsVision: true,
    supportsThinking: false,
    contextWindow: 1000000,
  },
} as const satisfies Record<string, GeminiModelConfig>;

/**
 * Gemini model ID type (keys already have gemini- prefix)
 */
export type GeminiModelId = keyof typeof GEMINI_MODEL_MAP;

/**
 * Get all Gemini model IDs
 */
export function getAllGeminiModelIds(): GeminiModelId[] {
  return Object.keys(GEMINI_MODEL_MAP) as GeminiModelId[];
}

/**
 * Default Gemini model (balanced choice)
 */
export const DEFAULT_GEMINI_MODEL: GeminiModelId = 'gemini-2.5-flash';

/**
 * Thinking level configuration for Gemini models
 * Note: The Gemini CLI does not currently expose a --thinking-level flag.
 * Thinking control (thinkingLevel/thinkingBudget) is available via the Gemini API.
 * This type is defined for potential future CLI support or API-level configuration.
 */
export type GeminiThinkingLevel = 'off' | 'low' | 'medium' | 'high';

/**
 * Gemini CLI authentication status
 */
export interface GeminiAuthStatus {
  authenticated: boolean;
  method: 'google_login' | 'api_key' | 'vertex_ai' | 'none';
  hasApiKey?: boolean;
  hasEnvApiKey?: boolean;
  hasCredentialsFile?: boolean;
  error?: string;
}
