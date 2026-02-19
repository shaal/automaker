/**
 * Hook for fetching multi-project overview data
 *
 * Provides real-time status across all projects for the unified dashboard.
 */

import { useState, useEffect, useCallback } from 'react';
import type { MultiProjectOverview } from '@automaker/types';
import { createLogger } from '@automaker/utils/logger';
import {
  getApiKey,
  getSessionToken,
  waitForApiKeyInit,
  getServerUrlSync,
} from '@/lib/http-api-client';

const logger = createLogger('useMultiProjectStatus');

interface UseMultiProjectStatusResult {
  overview: MultiProjectOverview | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Custom fetch function for projects overview
 * Uses the same pattern as HttpApiClient for proper authentication
 */
async function fetchProjectsOverview(): Promise<MultiProjectOverview> {
  // Ensure API key is initialized before making request (handles Electron/web mode timing)
  await waitForApiKeyInit();

  const serverUrl = getServerUrlSync();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Electron mode: use API key
  const apiKey = getApiKey();
  if (apiKey) {
    headers['X-API-Key'] = apiKey;
  } else {
    // Web mode: use session token if available
    const sessionToken = getSessionToken();
    if (sessionToken) {
      headers['X-Session-Token'] = sessionToken;
    }
  }

  const response = await fetch(`${serverUrl}/api/projects/overview`, {
    method: 'GET',
    headers,
    credentials: 'include', // Include cookies for session auth
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch project overview');
  }

  return {
    projects: data.projects,
    aggregate: data.aggregate,
    recentActivity: data.recentActivity,
    generatedAt: data.generatedAt,
  };
}

/**
 * Hook to fetch and manage multi-project overview data
 *
 * @param refreshInterval - Optional interval in ms to auto-refresh (default: 30000)
 */
export function useMultiProjectStatus(refreshInterval = 30000): UseMultiProjectStatusResult {
  const [overview, setOverview] = useState<MultiProjectOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchProjectsOverview();
      setOverview(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch overview';
      logger.error('Failed to fetch project overview:', err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Auto-refresh interval
  useEffect(() => {
    if (refreshInterval <= 0) return;

    const intervalId = setInterval(refresh, refreshInterval);
    return () => clearInterval(intervalId);
  }, [refresh, refreshInterval]);

  return {
    overview,
    isLoading,
    error,
    refresh,
  };
}
