/**
 * Provider exports
 */

// Base providers
export { BaseProvider } from './base-provider.js';
export {
  CliProvider,
  type SpawnStrategy,
  type CliSpawnConfig,
  type CliErrorInfo,
} from './cli-provider.js';
export type {
  ProviderConfig,
  ExecuteOptions,
  ProviderMessage,
  InstallationStatus,
  ModelDefinition,
} from './types.js';

// Claude provider
export { ClaudeProvider } from './claude-provider.js';

// Cursor provider
export { CursorProvider, CursorErrorCode, CursorError } from './cursor-provider.js';
export { CursorConfigManager } from './cursor-config-manager.js';

// OpenCode provider
export { OpencodeProvider } from './opencode-provider.js';

// Provider factory
export { ProviderFactory } from './provider-factory.js';

// Simple query service - unified interface for basic AI queries
export { simpleQuery, streamingQuery } from './simple-query-service.js';
export type {
  SimpleQueryOptions,
  SimpleQueryResult,
  StreamingQueryOptions,
} from './simple-query-service.js';
