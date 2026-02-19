/**
 * Test Runner Service
 *
 * Manages test execution processes for git worktrees.
 * Runs user-configured test commands with output streaming.
 *
 * Features:
 * - Process management with graceful shutdown
 * - Output buffering and throttling for WebSocket streaming
 * - Support for running all tests or specific files
 * - Cross-platform process cleanup (Windows/Unix)
 */

import { spawn, execSync, type ChildProcess } from 'child_process';
import * as secureFs from '../lib/secure-fs.js';
import { createLogger } from '@automaker/utils';
import type { EventEmitter } from '../lib/events.js';

const logger = createLogger('TestRunnerService');

// Maximum scrollback buffer size (characters)
const MAX_SCROLLBACK_SIZE = 50000; // ~50KB per test run

// Throttle output to prevent overwhelming WebSocket under heavy load
// Note: Too aggressive throttling (< 50ms) can cause memory issues and UI crashes
// due to rapid React state updates and string concatenation overhead
const OUTPUT_THROTTLE_MS = 100; // ~10fps - balances responsiveness with stability
const OUTPUT_BATCH_SIZE = 8192; // Larger batch size to reduce event frequency

/**
 * Status of a test run
 */
export type TestRunStatus = 'pending' | 'running' | 'passed' | 'failed' | 'cancelled' | 'error';

/**
 * Information about an active test run session
 */
export interface TestRunSession {
  /** Unique identifier for this test run */
  id: string;
  /** Path to the worktree where tests are running */
  worktreePath: string;
  /** The command being run */
  command: string;
  /** The spawned child process */
  process: ChildProcess | null;
  /** When the test run started */
  startedAt: Date;
  /** When the test run finished (if completed) */
  finishedAt: Date | null;
  /** Current status of the test run */
  status: TestRunStatus;
  /** Exit code from the process (if completed) */
  exitCode: number | null;
  /** Specific test file being run (optional) */
  testFile?: string;
  /** Scrollback buffer for log history (replay on reconnect) */
  scrollbackBuffer: string;
  /** Pending output to be flushed to subscribers */
  outputBuffer: string;
  /** Throttle timer for batching output */
  flushTimeout: NodeJS.Timeout | null;
  /** Flag to indicate session is stopping (prevents output after stop) */
  stopping: boolean;
}

/**
 * Result of a test run operation
 */
export interface TestRunResult {
  success: boolean;
  result?: {
    sessionId: string;
    worktreePath: string;
    command: string;
    status: TestRunStatus;
    testFile?: string;
    message: string;
  };
  error?: string;
}

/**
 * Test Runner Service class
 * Manages test execution processes across worktrees
 */
class TestRunnerService {
  private sessions: Map<string, TestRunSession> = new Map();
  private emitter: EventEmitter | null = null;

  /**
   * Set the event emitter for streaming log events
   * Called during service initialization with the global event emitter
   */
  setEventEmitter(emitter: EventEmitter): void {
    this.emitter = emitter;
  }

  /**
   * Helper to check if a file exists using secureFs
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await secureFs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Append data to scrollback buffer with size limit enforcement
   * Evicts oldest data when buffer exceeds MAX_SCROLLBACK_SIZE
   */
  private appendToScrollback(session: TestRunSession, data: string): void {
    session.scrollbackBuffer += data;
    if (session.scrollbackBuffer.length > MAX_SCROLLBACK_SIZE) {
      session.scrollbackBuffer = session.scrollbackBuffer.slice(-MAX_SCROLLBACK_SIZE);
    }
  }

  /**
   * Flush buffered output to WebSocket subscribers
   * Sends batched output to prevent overwhelming clients under heavy load
   */
  private flushOutput(session: TestRunSession): void {
    // Skip flush if session is stopping or buffer is empty
    if (session.stopping || session.outputBuffer.length === 0) {
      session.flushTimeout = null;
      return;
    }

    let dataToSend = session.outputBuffer;
    if (dataToSend.length > OUTPUT_BATCH_SIZE) {
      // Send in batches if buffer is large
      dataToSend = session.outputBuffer.slice(0, OUTPUT_BATCH_SIZE);
      session.outputBuffer = session.outputBuffer.slice(OUTPUT_BATCH_SIZE);
      // Schedule another flush for remaining data
      session.flushTimeout = setTimeout(() => this.flushOutput(session), OUTPUT_THROTTLE_MS);
    } else {
      session.outputBuffer = '';
      session.flushTimeout = null;
    }

    // Emit output event for WebSocket streaming
    if (this.emitter) {
      this.emitter.emit('test-runner:output', {
        sessionId: session.id,
        worktreePath: session.worktreePath,
        content: dataToSend,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Handle incoming stdout/stderr data from test process
   * Buffers data for scrollback replay and schedules throttled emission
   */
  private handleProcessOutput(session: TestRunSession, data: Buffer): void {
    // Skip output if session is stopping
    if (session.stopping) {
      return;
    }

    const content = data.toString();

    // Append to scrollback buffer for replay on reconnect
    this.appendToScrollback(session, content);

    // Buffer output for throttled live delivery
    session.outputBuffer += content;

    // Schedule flush if not already scheduled
    if (!session.flushTimeout) {
      session.flushTimeout = setTimeout(() => this.flushOutput(session), OUTPUT_THROTTLE_MS);
    }

    // Also log for debugging (existing behavior)
    logger.debug(`[${session.id}] ${content.trim()}`);
  }

  /**
   * Kill any process running (platform-specific cleanup)
   */
  private killProcessTree(pid: number): void {
    try {
      if (process.platform === 'win32') {
        // Windows: use taskkill to kill process tree
        execSync(`taskkill /F /T /PID ${pid}`, { stdio: 'ignore' });
      } else {
        // Unix: kill the process group
        try {
          process.kill(-pid, 'SIGTERM');
        } catch {
          // Fallback to killing just the process
          process.kill(pid, 'SIGTERM');
        }
      }
    } catch (error) {
      logger.debug(`Error killing process ${pid}:`, error);
    }
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `test-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }

  /**
   * Sanitize a test file path to prevent command injection
   * Allows only safe characters for file paths
   */
  private sanitizeTestFile(testFile: string): string {
    // Remove any shell metacharacters and normalize path
    // Allow only alphanumeric, dots, slashes, hyphens, underscores, colons (for Windows paths)
    return testFile.replace(/[^a-zA-Z0-9.\\/_\-:]/g, '');
  }

  /**
   * Start tests in a worktree using the provided command
   *
   * @param worktreePath - Path to the worktree where tests should run
   * @param options - Configuration for the test run
   * @returns TestRunResult with session info or error
   */
  async startTests(
    worktreePath: string,
    options: {
      command: string;
      testFile?: string;
    }
  ): Promise<TestRunResult> {
    const { command, testFile } = options;

    // Check if already running
    const existingSession = this.getActiveSession(worktreePath);
    if (existingSession) {
      return {
        success: false,
        error: `Tests are already running for this worktree (session: ${existingSession.id})`,
      };
    }

    // Verify the worktree exists
    if (!(await this.fileExists(worktreePath))) {
      return {
        success: false,
        error: `Worktree path does not exist: ${worktreePath}`,
      };
    }

    if (!command) {
      return {
        success: false,
        error: 'No test command provided',
      };
    }

    // Build the final command (append test file if specified)
    let finalCommand = command;
    if (testFile) {
      // Sanitize test file path to prevent command injection
      const sanitizedFile = this.sanitizeTestFile(testFile);
      // Append the test file to the command
      // Most test runners support: command -- file or command file
      finalCommand = `${command} -- ${sanitizedFile}`;
    }

    // Parse command into cmd and args (shell execution)
    // We use shell: true to support complex commands like "npm run test:server"
    logger.info(`Starting tests in ${worktreePath}`);
    logger.info(`Command: ${finalCommand}`);

    // Create session
    const sessionId = this.generateSessionId();
    const session: TestRunSession = {
      id: sessionId,
      worktreePath,
      command: finalCommand,
      process: null,
      startedAt: new Date(),
      finishedAt: null,
      status: 'pending',
      exitCode: null,
      testFile,
      scrollbackBuffer: '',
      outputBuffer: '',
      flushTimeout: null,
      stopping: false,
    };

    // Spawn the test process using shell
    const env = {
      ...process.env,
      FORCE_COLOR: '1',
      COLORTERM: 'truecolor',
      TERM: 'xterm-256color',
      CI: 'true', // Helps some test runners format output better
    };

    const testProcess = spawn(finalCommand, [], {
      cwd: worktreePath,
      env,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: process.platform !== 'win32', // Use process groups on Unix for cleanup
    });

    session.process = testProcess;
    session.status = 'running';

    // Track if process failed early
    const status = { error: null as string | null, exited: false };

    // Helper to clean up resources and emit events
    const cleanupAndFinish = (
      exitCode: number | null,
      finalStatus: TestRunStatus,
      errorMessage?: string
    ) => {
      session.finishedAt = new Date();
      session.exitCode = exitCode;
      session.status = finalStatus;

      if (session.flushTimeout) {
        clearTimeout(session.flushTimeout);
        session.flushTimeout = null;
      }

      // Flush any remaining output
      if (session.outputBuffer.length > 0 && this.emitter && !session.stopping) {
        this.emitter.emit('test-runner:output', {
          sessionId: session.id,
          worktreePath: session.worktreePath,
          content: session.outputBuffer,
          timestamp: new Date().toISOString(),
        });
        session.outputBuffer = '';
      }

      // Emit completed event
      if (this.emitter && !session.stopping) {
        this.emitter.emit('test-runner:completed', {
          sessionId: session.id,
          worktreePath: session.worktreePath,
          command: session.command,
          status: finalStatus,
          exitCode,
          error: errorMessage,
          duration: session.finishedAt.getTime() - session.startedAt.getTime(),
          timestamp: new Date().toISOString(),
        });
      }
    };

    // Capture stdout
    if (testProcess.stdout) {
      testProcess.stdout.on('data', (data: Buffer) => {
        this.handleProcessOutput(session, data);
      });
    }

    // Capture stderr
    if (testProcess.stderr) {
      testProcess.stderr.on('data', (data: Buffer) => {
        this.handleProcessOutput(session, data);
      });
    }

    testProcess.on('error', (error) => {
      logger.error(`Process error for ${sessionId}:`, error);
      status.error = error.message;
      cleanupAndFinish(null, 'error', error.message);
    });

    testProcess.on('exit', (code) => {
      logger.info(`Test process for ${worktreePath} exited with code ${code}`);
      status.exited = true;

      // Determine final status based on exit code
      let finalStatus: TestRunStatus;
      if (session.stopping) {
        finalStatus = 'cancelled';
      } else if (code === 0) {
        finalStatus = 'passed';
      } else {
        finalStatus = 'failed';
      }

      cleanupAndFinish(code, finalStatus);
    });

    // Store session
    this.sessions.set(sessionId, session);

    // Wait a moment to see if the process fails immediately
    await new Promise((resolve) => setTimeout(resolve, 200));

    if (status.error) {
      return {
        success: false,
        error: `Failed to start tests: ${status.error}`,
      };
    }

    if (status.exited) {
      // Process already exited - check if it was immediate failure
      const exitedSession = this.sessions.get(sessionId);
      if (exitedSession && exitedSession.status === 'error') {
        return {
          success: false,
          error: `Test process exited immediately. Check output for details.`,
        };
      }
    }

    // Emit started event
    if (this.emitter) {
      this.emitter.emit('test-runner:started', {
        sessionId,
        worktreePath,
        command: finalCommand,
        testFile,
        timestamp: new Date().toISOString(),
      });
    }

    return {
      success: true,
      result: {
        sessionId,
        worktreePath,
        command: finalCommand,
        status: 'running',
        testFile,
        message: `Tests started: ${finalCommand}`,
      },
    };
  }

  /**
   * Stop a running test session
   *
   * @param sessionId - The ID of the test session to stop
   * @returns Result with success status and message
   */
  async stopTests(sessionId: string): Promise<{
    success: boolean;
    result?: { sessionId: string; message: string };
    error?: string;
  }> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return {
        success: false,
        error: `Test session not found: ${sessionId}`,
      };
    }

    if (session.status !== 'running') {
      return {
        success: true,
        result: {
          sessionId,
          message: `Tests already finished (status: ${session.status})`,
        },
      };
    }

    logger.info(`Cancelling test session ${sessionId}`);

    // Mark as stopping to prevent further output events
    session.stopping = true;

    // Clean up flush timeout
    if (session.flushTimeout) {
      clearTimeout(session.flushTimeout);
      session.flushTimeout = null;
    }

    // Kill the process
    if (session.process && !session.process.killed && session.process.pid) {
      this.killProcessTree(session.process.pid);
    }

    session.status = 'cancelled';
    session.finishedAt = new Date();

    // Emit cancelled event
    if (this.emitter) {
      this.emitter.emit('test-runner:completed', {
        sessionId,
        worktreePath: session.worktreePath,
        command: session.command,
        status: 'cancelled',
        exitCode: null,
        duration: session.finishedAt.getTime() - session.startedAt.getTime(),
        timestamp: new Date().toISOString(),
      });
    }

    return {
      success: true,
      result: {
        sessionId,
        message: 'Test run cancelled',
      },
    };
  }

  /**
   * Get the active test session for a worktree
   */
  getActiveSession(worktreePath: string): TestRunSession | undefined {
    for (const session of this.sessions.values()) {
      if (session.worktreePath === worktreePath && session.status === 'running') {
        return session;
      }
    }
    return undefined;
  }

  /**
   * Get a test session by ID
   */
  getSession(sessionId: string): TestRunSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get buffered output for a test session
   */
  getSessionOutput(sessionId: string): {
    success: boolean;
    result?: {
      sessionId: string;
      output: string;
      status: TestRunStatus;
      startedAt: string;
      finishedAt: string | null;
    };
    error?: string;
  } {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return {
        success: false,
        error: `Test session not found: ${sessionId}`,
      };
    }

    return {
      success: true,
      result: {
        sessionId,
        output: session.scrollbackBuffer,
        status: session.status,
        startedAt: session.startedAt.toISOString(),
        finishedAt: session.finishedAt?.toISOString() || null,
      },
    };
  }

  /**
   * List all test sessions (optionally filter by worktree)
   */
  listSessions(worktreePath?: string): {
    success: boolean;
    result: {
      sessions: Array<{
        sessionId: string;
        worktreePath: string;
        command: string;
        status: TestRunStatus;
        testFile?: string;
        startedAt: string;
        finishedAt: string | null;
        exitCode: number | null;
      }>;
    };
  } {
    let sessions = Array.from(this.sessions.values());

    if (worktreePath) {
      sessions = sessions.filter((s) => s.worktreePath === worktreePath);
    }

    return {
      success: true,
      result: {
        sessions: sessions.map((s) => ({
          sessionId: s.id,
          worktreePath: s.worktreePath,
          command: s.command,
          status: s.status,
          testFile: s.testFile,
          startedAt: s.startedAt.toISOString(),
          finishedAt: s.finishedAt?.toISOString() || null,
          exitCode: s.exitCode,
        })),
      },
    };
  }

  /**
   * Check if a worktree has an active test run
   */
  isRunning(worktreePath: string): boolean {
    return this.getActiveSession(worktreePath) !== undefined;
  }

  /**
   * Clean up old completed sessions (keep only recent ones)
   */
  cleanupOldSessions(maxAgeMs: number = 30 * 60 * 1000): void {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.status !== 'running' && session.finishedAt) {
        if (now - session.finishedAt.getTime() > maxAgeMs) {
          this.sessions.delete(sessionId);
          logger.debug(`Cleaned up old test session: ${sessionId}`);
        }
      }
    }
  }

  /**
   * Cancel all running test sessions (for cleanup)
   */
  async cancelAll(): Promise<void> {
    logger.info(`Cancelling all ${this.sessions.size} test sessions`);

    for (const session of this.sessions.values()) {
      if (session.status === 'running') {
        await this.stopTests(session.id);
      }
    }
  }

  /**
   * Cleanup service resources
   */
  async cleanup(): Promise<void> {
    await this.cancelAll();
    this.sessions.clear();
  }
}

// Singleton instance
let testRunnerServiceInstance: TestRunnerService | null = null;

export function getTestRunnerService(): TestRunnerService {
  if (!testRunnerServiceInstance) {
    testRunnerServiceInstance = new TestRunnerService();
  }
  return testRunnerServiceInstance;
}

// Cleanup on process exit
process.on('SIGTERM', () => {
  if (testRunnerServiceInstance) {
    testRunnerServiceInstance.cleanup().catch((err) => {
      logger.error('Cleanup failed on SIGTERM:', err);
    });
  }
});

process.on('SIGINT', () => {
  if (testRunnerServiceInstance) {
    testRunnerServiceInstance.cleanup().catch((err) => {
      logger.error('Cleanup failed on SIGINT:', err);
    });
  }
});

// Export the class for testing purposes
export { TestRunnerService };
