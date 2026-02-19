/**
 * CLI Status Query Hooks
 *
 * React Query hooks for fetching CLI tool status (Claude, GitHub CLI, etc.)
 */

import { useQuery } from '@tanstack/react-query';
import { getElectronAPI } from '@/lib/electron';
import { queryKeys } from '@/lib/query-keys';
import { STALE_TIMES } from '@/lib/query-client';

/**
 * Fetch Claude CLI status
 *
 * @returns Query result with Claude CLI status
 */
export function useClaudeCliStatus() {
  return useQuery({
    queryKey: queryKeys.cli.claude(),
    queryFn: async () => {
      const api = getElectronAPI();
      if (!api.setup) {
        throw new Error('Setup API not available');
      }
      const result = await api.setup.getClaudeStatus();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch Claude status');
      }
      return result;
    },
    staleTime: STALE_TIMES.CLI_STATUS,
  });
}

/**
 * Fetch GitHub CLI status
 *
 * @returns Query result with GitHub CLI status
 */
export function useGitHubCliStatus() {
  return useQuery({
    queryKey: queryKeys.cli.github(),
    queryFn: async () => {
      const api = getElectronAPI();
      if (!api.setup?.getGhStatus) {
        throw new Error('GitHub CLI status API not available');
      }
      const result = await api.setup.getGhStatus();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch GitHub CLI status');
      }
      return result;
    },
    staleTime: STALE_TIMES.CLI_STATUS,
  });
}

/**
 * Fetch API keys status
 *
 * @returns Query result with API keys status
 */
export function useApiKeysStatus() {
  return useQuery({
    queryKey: queryKeys.cli.apiKeys(),
    queryFn: async () => {
      const api = getElectronAPI();
      if (!api.setup) {
        throw new Error('Setup API not available');
      }
      const result = await api.setup.getApiKeys();
      if (!result.success) {
        throw new Error('Failed to fetch API keys');
      }
      return result;
    },
    staleTime: STALE_TIMES.CLI_STATUS,
  });
}

/**
 * Fetch platform info
 *
 * @returns Query result with platform info
 */
export function usePlatformInfo() {
  return useQuery({
    queryKey: queryKeys.cli.platform(),
    queryFn: async () => {
      const api = getElectronAPI();
      if (!api.setup) {
        throw new Error('Setup API not available');
      }
      const result = await api.setup.getPlatform();
      if (!result.success) {
        throw new Error('Failed to fetch platform info');
      }
      return result;
    },
    staleTime: Infinity, // Platform info never changes
  });
}

/**
 * Fetch Cursor CLI status
 *
 * @returns Query result with Cursor CLI status
 */
export function useCursorCliStatus() {
  return useQuery({
    queryKey: queryKeys.cli.cursor(),
    queryFn: async () => {
      const api = getElectronAPI();
      if (!api.setup?.getCursorStatus) {
        throw new Error('Cursor CLI status API not available');
      }
      const result = await api.setup.getCursorStatus();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch Cursor CLI status');
      }
      return result;
    },
    staleTime: STALE_TIMES.CLI_STATUS,
  });
}

/**
 * Fetch Copilot CLI status
 *
 * @returns Query result with Copilot CLI status
 */
export function useCopilotCliStatus() {
  return useQuery({
    queryKey: queryKeys.cli.copilot(),
    queryFn: async () => {
      const api = getElectronAPI();
      if (!api.setup?.getCopilotStatus) {
        throw new Error('Copilot CLI status API not available');
      }
      const result = await api.setup.getCopilotStatus();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch Copilot CLI status');
      }
      return result;
    },
    staleTime: STALE_TIMES.CLI_STATUS,
  });
}

/**
 * Fetch Gemini CLI status
 *
 * @returns Query result with Gemini CLI status
 */
export function useGeminiCliStatus() {
  return useQuery({
    queryKey: queryKeys.cli.gemini(),
    queryFn: async () => {
      const api = getElectronAPI();
      if (!api.setup?.getGeminiStatus) {
        throw new Error('Gemini CLI status API not available');
      }
      const result = await api.setup.getGeminiStatus();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch Gemini CLI status');
      }
      return result;
    },
    staleTime: STALE_TIMES.CLI_STATUS,
  });
}

/**
 * Fetch OpenCode CLI status
 *
 * @returns Query result with OpenCode CLI status
 */
export function useOpencodeCliStatus() {
  return useQuery({
    queryKey: queryKeys.cli.opencode(),
    queryFn: async () => {
      const api = getElectronAPI();
      if (!api.setup?.getOpencodeStatus) {
        throw new Error('OpenCode CLI status API not available');
      }
      const result = await api.setup.getOpencodeStatus();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch OpenCode CLI status');
      }
      return result;
    },
    staleTime: STALE_TIMES.CLI_STATUS,
  });
}
