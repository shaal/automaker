/**
 * useTestLogs - Hook for test log streaming and retrieval
 *
 * This hook provides a focused interface for:
 * - Fetching initial buffered test logs
 * - Subscribing to real-time log streaming
 * - Managing log state for display components
 *
 * Unlike useTestRunners, this hook focuses solely on log retrieval
 * and streaming, making it ideal for log display components.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { createLogger } from '@automaker/utils/logger';
import { getElectronAPI } from '@/lib/electron';
import { pathsEqual } from '@/lib/utils';
import type {
  TestRunStatus,
  TestRunnerStartedEvent,
  TestRunnerOutputEvent,
  TestRunnerCompletedEvent,
} from '@/types/electron';

const logger = createLogger('TestLogs');

// ============================================================================
// Types
// ============================================================================

/**
 * State for test log management
 */
export interface TestLogState {
  /** The accumulated log content */
  logs: string;
  /** Whether initial logs are being fetched */
  isLoading: boolean;
  /** Error message if fetching logs failed */
  error: string | null;
  /** Current status of the test run */
  status: TestRunStatus | null;
  /** Session ID of the current test run */
  sessionId: string | null;
  /** The test command being run (from project settings) */
  command: string | null;
  /** Specific test file being run (if applicable) */
  testFile: string | null;
  /** Timestamp when the test run started */
  startedAt: string | null;
  /** Timestamp when the test run finished (if completed) */
  finishedAt: string | null;
  /** Exit code (if test run completed) */
  exitCode: number | null;
  /** Duration in milliseconds (if completed) */
  duration: number | null;
}

/**
 * Options for the useTestLogs hook
 */
export interface UseTestLogsOptions {
  /** Path to the worktree to monitor logs for */
  worktreePath: string | null;
  /** Specific session ID to fetch logs for (optional - will get active/recent if not provided) */
  sessionId?: string;
  /** Whether to automatically subscribe to log events (default: true) */
  autoSubscribe?: boolean;
}

// ============================================================================
// Initial State
// ============================================================================

const initialState: TestLogState = {
  logs: '',
  isLoading: false,
  error: null,
  status: null,
  sessionId: null,
  command: null,
  testFile: null,
  startedAt: null,
  finishedAt: null,
  exitCode: null,
  duration: null,
};

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to subscribe to test log events and manage log state.
 *
 * This hook:
 * 1. Fetches initial buffered logs from the server
 * 2. Subscribes to WebSocket events for real-time log streaming
 * 3. Handles test runner started/output/completed events
 * 4. Provides log state for rendering in a panel
 *
 * @example
 * ```tsx
 * const { logs, status, isLoading, isRunning } = useTestLogs({
 *   worktreePath: '/path/to/worktree'
 * });
 *
 * return (
 *   <div>
 *     {isLoading && <Spinner />}
 *     {isRunning && <Badge>Running</Badge>}
 *     <pre>{logs}</pre>
 *   </div>
 * );
 * ```
 */
export function useTestLogs({
  worktreePath,
  sessionId: targetSessionId,
  autoSubscribe = true,
}: UseTestLogsOptions) {
  const [state, setState] = useState<TestLogState>(initialState);

  // Keep track of whether we've fetched initial logs
  const hasFetchedInitialLogs = useRef(false);

  // Track the current session ID for filtering events
  const currentSessionId = useRef<string | null>(targetSessionId ?? null);

  // Guard against stale fetch results when switching worktrees/sessions
  const fetchSeq = useRef(0);

  /**
   * Derived state: whether tests are currently running
   */
  const isRunning = state.status === 'running' || state.status === 'pending';

  /**
   * Fetch buffered logs from the server
   */
  const fetchLogs = useCallback(async () => {
    if (!worktreePath && !targetSessionId) return;

    // Increment sequence to guard against stale responses
    const seq = ++fetchSeq.current;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const api = getElectronAPI();
      if (!api?.worktree?.getTestLogs) {
        // Check if this request is still current
        if (seq !== fetchSeq.current) return;
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: 'Test logs API not available',
        }));
        return;
      }

      const result = await api.worktree.getTestLogs(worktreePath ?? undefined, targetSessionId);

      // Check if this request is still current (prevent stale updates)
      if (seq !== fetchSeq.current) return;

      if (result.success && result.result) {
        const { sessionId, command, status, testFile, logs, startedAt, finishedAt, exitCode } =
          result.result;

        // Update current session ID for event filtering
        currentSessionId.current = sessionId;

        setState((prev) => ({
          ...prev,
          logs,
          isLoading: false,
          error: null,
          status,
          sessionId,
          command,
          testFile: testFile ?? null,
          startedAt,
          finishedAt,
          exitCode,
          duration: null, // Not provided by getTestLogs
        }));
        hasFetchedInitialLogs.current = true;
      } else {
        // No active session - this is not necessarily an error
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: result.error || null,
        }));
      }
    } catch (error) {
      // Check if this request is still current
      if (seq !== fetchSeq.current) return;
      logger.error('Failed to fetch test logs:', error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch logs',
      }));
    }
  }, [worktreePath, targetSessionId]);

  /**
   * Clear logs and reset state
   */
  const clearLogs = useCallback(() => {
    setState(initialState);
    hasFetchedInitialLogs.current = false;
    currentSessionId.current = targetSessionId ?? null;
  }, [targetSessionId]);

  /**
   * Append content to logs
   */
  const appendLogs = useCallback((content: string) => {
    setState((prev) => ({
      ...prev,
      logs: prev.logs + content,
    }));
  }, []);

  // Fetch initial logs when worktreePath or sessionId changes
  useEffect(() => {
    if ((worktreePath || targetSessionId) && autoSubscribe) {
      hasFetchedInitialLogs.current = false;
      fetchLogs();
    } else {
      clearLogs();
    }
  }, [worktreePath, targetSessionId, autoSubscribe, fetchLogs, clearLogs]);

  // Subscribe to WebSocket events
  useEffect(() => {
    if (!autoSubscribe) return;
    if (!worktreePath && !targetSessionId) return;

    const api = getElectronAPI();
    if (!api?.worktree?.onTestRunnerEvent) {
      logger.warn('Test runner event subscription not available');
      return;
    }

    const unsubscribe = api.worktree.onTestRunnerEvent((event) => {
      // Filter events based on worktree path or session ID
      const eventWorktreePath = event.payload.worktreePath;
      const eventSessionId = event.payload.sessionId;

      // If we have a specific session ID target, only accept events for that session
      if (targetSessionId && eventSessionId !== targetSessionId) {
        return;
      }

      // If we have a worktree path, filter by that
      if (worktreePath && !pathsEqual(eventWorktreePath, worktreePath)) {
        return;
      }

      switch (event.type) {
        case 'test-runner:started': {
          const payload = event.payload as TestRunnerStartedEvent;
          logger.info('Test run started:', payload);

          // Update current session ID for future event filtering
          currentSessionId.current = payload.sessionId;

          setState((prev) => ({
            ...prev,
            status: 'running',
            sessionId: payload.sessionId,
            command: payload.command,
            testFile: payload.testFile ?? null,
            startedAt: payload.timestamp,
            finishedAt: null,
            exitCode: null,
            duration: null,
            // Clear logs on new test run start
            logs: '',
            error: null,
          }));
          hasFetchedInitialLogs.current = false;
          break;
        }

        case 'test-runner:output': {
          const payload = event.payload as TestRunnerOutputEvent;

          // Only append if this is for our current session
          if (currentSessionId.current && payload.sessionId !== currentSessionId.current) {
            return;
          }

          // Append the new output to existing logs
          if (payload.content) {
            appendLogs(payload.content);
          }
          break;
        }

        case 'test-runner:completed': {
          const payload = event.payload as TestRunnerCompletedEvent;
          logger.info('Test run completed:', payload);

          // Only update if this is for our current session
          if (currentSessionId.current && payload.sessionId !== currentSessionId.current) {
            return;
          }

          setState((prev) => ({
            ...prev,
            status: payload.status,
            finishedAt: payload.timestamp,
            exitCode: payload.exitCode,
            duration: payload.duration,
          }));
          break;
        }
      }
    });

    return unsubscribe;
  }, [worktreePath, targetSessionId, autoSubscribe, appendLogs]);

  return {
    // State
    ...state,

    // Derived state
    /** Whether tests are currently running */
    isRunning,

    // Actions
    /** Fetch/refresh logs from the server */
    fetchLogs,
    /** Clear logs and reset state */
    clearLogs,
    /** Manually append content to logs */
    appendLogs,
  };
}

/**
 * Hook for subscribing to test log output events globally (across all sessions)
 *
 * Useful for notification systems or global log monitoring.
 *
 * @example
 * ```tsx
 * useTestLogEvents({
 *   onOutput: (sessionId, content) => {
 *     console.log(`[${sessionId}] ${content}`);
 *   },
 *   onCompleted: (sessionId, status) => {
 *     toast(`Tests ${status}!`);
 *   },
 * });
 * ```
 */
export function useTestLogEvents(handlers: {
  onStarted?: (event: TestRunnerStartedEvent) => void;
  onOutput?: (event: TestRunnerOutputEvent) => void;
  onCompleted?: (event: TestRunnerCompletedEvent) => void;
}) {
  const { onStarted, onOutput, onCompleted } = handlers;

  useEffect(() => {
    const api = getElectronAPI();
    if (!api?.worktree?.onTestRunnerEvent) {
      logger.warn('Test runner event subscription not available');
      return;
    }

    const unsubscribe = api.worktree.onTestRunnerEvent((event) => {
      switch (event.type) {
        case 'test-runner:started':
          onStarted?.(event.payload as TestRunnerStartedEvent);
          break;
        case 'test-runner:output':
          onOutput?.(event.payload as TestRunnerOutputEvent);
          break;
        case 'test-runner:completed':
          onCompleted?.(event.payload as TestRunnerCompletedEvent);
          break;
      }
    });

    return unsubscribe;
  }, [onStarted, onOutput, onCompleted]);
}

// Re-export types for convenience
export type { TestRunStatus };
