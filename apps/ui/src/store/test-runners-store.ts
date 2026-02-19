/**
 * Test Runners Store - State management for test runner sessions
 */

import { create } from 'zustand';
import type { TestRunStatus } from '@/types/electron';

// ============================================================================
// Types
// ============================================================================

/**
 * A test run session
 */
export interface TestSession {
  /** Unique session ID */
  sessionId: string;
  /** Path to the worktree where tests are running */
  worktreePath: string;
  /** The test command being run (from project settings) */
  command: string;
  /** Current status of the test run */
  status: TestRunStatus;
  /** Optional: specific test file being run */
  testFile?: string;
  /** When the test run started */
  startedAt: string;
  /** When the test run finished (if completed) */
  finishedAt?: string;
  /** Exit code (if completed) */
  exitCode?: number | null;
  /** Duration in milliseconds (if completed) */
  duration?: number;
  /** Accumulated output logs */
  output: string;
}

// ============================================================================
// State Interface
// ============================================================================

interface TestRunnersState {
  /** Map of sessionId -> TestSession for all tracked sessions */
  sessions: Record<string, TestSession>;
  /** Map of worktreePath -> sessionId for quick lookup of active session per worktree */
  activeSessionByWorktree: Record<string, string>;
  /** Loading state for initial data fetch */
  isLoading: boolean;
  /** Error state */
  error: string | null;
}

// ============================================================================
// Actions Interface
// ============================================================================

interface TestRunnersActions {
  /** Add or update a session when a test run starts */
  startSession: (session: Omit<TestSession, 'output'>) => void;

  /** Append output to a session */
  appendOutput: (sessionId: string, content: string) => void;

  /** Complete a session with final status */
  completeSession: (
    sessionId: string,
    status: TestRunStatus,
    exitCode: number | null,
    duration: number
  ) => void;

  /** Get the active session for a worktree */
  getActiveSession: (worktreePath: string) => TestSession | null;

  /** Get a session by ID */
  getSession: (sessionId: string) => TestSession | null;

  /** Check if a worktree has an active (running) test session */
  isWorktreeRunning: (worktreePath: string) => boolean;

  /** Remove a session (cleanup) */
  removeSession: (sessionId: string) => void;

  /** Clear all sessions for a worktree */
  clearWorktreeSessions: (worktreePath: string) => void;

  /** Set loading state */
  setLoading: (loading: boolean) => void;

  /** Set error state */
  setError: (error: string | null) => void;

  /** Reset the store */
  reset: () => void;
}

// ============================================================================
// Initial State
// ============================================================================

const initialState: TestRunnersState = {
  sessions: {},
  activeSessionByWorktree: {},
  isLoading: false,
  error: null,
};

// ============================================================================
// Store
// ============================================================================

export const useTestRunnersStore = create<TestRunnersState & TestRunnersActions>((set, get) => ({
  ...initialState,

  startSession: (session) => {
    const newSession: TestSession = {
      ...session,
      output: '',
    };

    set((state) => ({
      sessions: {
        ...state.sessions,
        [session.sessionId]: newSession,
      },
      activeSessionByWorktree: {
        ...state.activeSessionByWorktree,
        [session.worktreePath]: session.sessionId,
      },
    }));
  },

  appendOutput: (sessionId, content) => {
    set((state) => {
      const session = state.sessions[sessionId];
      if (!session) return state;

      return {
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...session,
            output: session.output + content,
          },
        },
      };
    });
  },

  completeSession: (sessionId, status, exitCode, duration) => {
    set((state) => {
      const session = state.sessions[sessionId];
      if (!session) return state;

      const finishedAt = new Date().toISOString();

      // Remove from active sessions since it's no longer running
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [session.worktreePath]: _, ...remainingActive } = state.activeSessionByWorktree;

      return {
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...session,
            status,
            exitCode,
            duration,
            finishedAt,
          },
        },
        // Only remove from active if this is the current active session
        activeSessionByWorktree:
          state.activeSessionByWorktree[session.worktreePath] === sessionId
            ? remainingActive
            : state.activeSessionByWorktree,
      };
    });
  },

  getActiveSession: (worktreePath) => {
    const state = get();
    const sessionId = state.activeSessionByWorktree[worktreePath];
    if (!sessionId) return null;
    return state.sessions[sessionId] || null;
  },

  getSession: (sessionId) => {
    return get().sessions[sessionId] || null;
  },

  isWorktreeRunning: (worktreePath) => {
    const state = get();
    const sessionId = state.activeSessionByWorktree[worktreePath];
    if (!sessionId) return false;
    const session = state.sessions[sessionId];
    return session?.status === 'running' || session?.status === 'pending';
  },

  removeSession: (sessionId) => {
    set((state) => {
      const session = state.sessions[sessionId];
      if (!session) return state;

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [sessionId]: _, ...remainingSessions } = state.sessions;

      // Remove from active if this was the active session
      const { [session.worktreePath]: activeId, ...remainingActive } =
        state.activeSessionByWorktree;

      return {
        sessions: remainingSessions,
        activeSessionByWorktree:
          activeId === sessionId ? remainingActive : state.activeSessionByWorktree,
      };
    });
  },

  clearWorktreeSessions: (worktreePath) => {
    set((state) => {
      // Find all sessions for this worktree
      const sessionsToRemove = Object.values(state.sessions)
        .filter((s) => s.worktreePath === worktreePath)
        .map((s) => s.sessionId);

      // Remove them from sessions
      const remainingSessions = { ...state.sessions };
      sessionsToRemove.forEach((id) => {
        delete remainingSessions[id];
      });

      // Remove from active
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [worktreePath]: _, ...remainingActive } = state.activeSessionByWorktree;

      return {
        sessions: remainingSessions,
        activeSessionByWorktree: remainingActive,
      };
    });
  },

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  reset: () => set(initialState),
}));
