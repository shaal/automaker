/**
 * Terminal Service
 *
 * Manages PTY (pseudo-terminal) sessions using node-pty.
 * Supports cross-platform shell detection including WSL.
 */

import * as pty from 'node-pty';
import { EventEmitter } from 'events';
import * as os from 'os';
import * as path from 'path';
// secureFs is used for user-controllable paths (working directory validation)
// to enforce ALLOWED_ROOT_DIRECTORY security boundary
import * as secureFs from '../lib/secure-fs.js';
import { createLogger } from '@automaker/utils';
import type { SettingsService } from './settings-service.js';
import { getTerminalThemeColors, getAllTerminalThemes } from '../lib/terminal-themes-data.js';
import {
  getRcFilePath,
  getTerminalDir,
  ensureRcFilesUpToDate,
  type TerminalConfig,
} from '@automaker/platform';

const logger = createLogger('Terminal');
// System paths module handles shell binary checks and WSL detection
// These are system paths outside ALLOWED_ROOT_DIRECTORY, centralized for security auditing
import {
  systemPathExists,
  systemPathReadFileSync,
  getWslVersionPath,
  getShellPaths,
} from '@automaker/platform';

const BASH_LOGIN_ARG = '--login';
const BASH_RCFILE_ARG = '--rcfile';
const SHELL_NAME_BASH = 'bash';
const SHELL_NAME_ZSH = 'zsh';
const SHELL_NAME_SH = 'sh';
const DEFAULT_SHOW_USER_HOST = true;
const DEFAULT_SHOW_PATH = true;
const DEFAULT_SHOW_TIME = false;
const DEFAULT_SHOW_EXIT_STATUS = false;
const DEFAULT_PATH_DEPTH = 0;
const DEFAULT_PATH_STYLE: TerminalConfig['pathStyle'] = 'full';
const DEFAULT_CUSTOM_PROMPT = true;
const DEFAULT_PROMPT_FORMAT: TerminalConfig['promptFormat'] = 'standard';
const DEFAULT_SHOW_GIT_BRANCH = true;
const DEFAULT_SHOW_GIT_STATUS = true;
const DEFAULT_CUSTOM_ALIASES = '';
const DEFAULT_CUSTOM_ENV_VARS: Record<string, string> = {};
const PROMPT_THEME_CUSTOM = 'custom';
const PROMPT_THEME_PREFIX = 'omp-';
const OMP_THEME_ENV_VAR = 'AUTOMAKER_OMP_THEME';

// Maximum scrollback buffer size (characters)
const MAX_SCROLLBACK_SIZE = 50000; // ~50KB per terminal

// Session limit constants - shared with routes/settings.ts
export const MIN_MAX_SESSIONS = 1;
export const MAX_MAX_SESSIONS = 1000;

// Maximum number of concurrent terminal sessions
// Can be overridden via TERMINAL_MAX_SESSIONS environment variable
// Default set to 1000 - effectively unlimited for most use cases
let maxSessions = parseInt(process.env.TERMINAL_MAX_SESSIONS || '1000', 10);

// Throttle output to prevent overwhelming WebSocket under heavy load
// Using 4ms for responsive input feedback while still preventing flood
// Note: 16ms caused perceived input lag, especially with backspace
const OUTPUT_THROTTLE_MS = 4; // ~250fps max update rate for responsive input
const OUTPUT_BATCH_SIZE = 4096; // Smaller batches for lower latency

function applyBashRcFileArgs(args: string[], rcFilePath: string): string[] {
  const sanitizedArgs: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === BASH_LOGIN_ARG) {
      continue;
    }
    if (arg === BASH_RCFILE_ARG) {
      index += 1;
      continue;
    }
    sanitizedArgs.push(arg);
  }

  sanitizedArgs.push(BASH_RCFILE_ARG, rcFilePath);
  return sanitizedArgs;
}

function normalizePathStyle(
  pathStyle: TerminalConfig['pathStyle'] | undefined
): TerminalConfig['pathStyle'] {
  if (pathStyle === 'short' || pathStyle === 'basename') {
    return pathStyle;
  }
  return DEFAULT_PATH_STYLE;
}

function normalizePathDepth(pathDepth: number | undefined): number {
  const depth =
    typeof pathDepth === 'number' && Number.isFinite(pathDepth) ? pathDepth : DEFAULT_PATH_DEPTH;
  return Math.max(DEFAULT_PATH_DEPTH, Math.floor(depth));
}

function getShellBasename(shellPath: string): string {
  const lastSep = Math.max(shellPath.lastIndexOf('/'), shellPath.lastIndexOf('\\'));
  return lastSep >= 0 ? shellPath.slice(lastSep + 1) : shellPath;
}

function getShellArgsForPath(shellPath: string): string[] {
  const shellName = getShellBasename(shellPath).toLowerCase().replace('.exe', '');
  if (shellName === 'powershell' || shellName === 'pwsh' || shellName === 'cmd') {
    return [];
  }
  if (shellName === SHELL_NAME_SH) {
    return [];
  }
  return [BASH_LOGIN_ARG];
}

function resolveOmpThemeName(promptTheme: string | undefined): string | null {
  if (!promptTheme || promptTheme === PROMPT_THEME_CUSTOM) {
    return null;
  }
  if (promptTheme.startsWith(PROMPT_THEME_PREFIX)) {
    return promptTheme.slice(PROMPT_THEME_PREFIX.length);
  }
  return null;
}

function buildEffectiveTerminalConfig(
  globalTerminalConfig: TerminalConfig | undefined,
  projectTerminalConfig: Partial<TerminalConfig> | undefined
): TerminalConfig {
  const mergedEnvVars = {
    ...(globalTerminalConfig?.customEnvVars ?? DEFAULT_CUSTOM_ENV_VARS),
    ...(projectTerminalConfig?.customEnvVars ?? DEFAULT_CUSTOM_ENV_VARS),
  };

  return {
    enabled: projectTerminalConfig?.enabled ?? globalTerminalConfig?.enabled ?? false,
    customPrompt: globalTerminalConfig?.customPrompt ?? DEFAULT_CUSTOM_PROMPT,
    promptFormat: globalTerminalConfig?.promptFormat ?? DEFAULT_PROMPT_FORMAT,
    showGitBranch:
      projectTerminalConfig?.showGitBranch ??
      globalTerminalConfig?.showGitBranch ??
      DEFAULT_SHOW_GIT_BRANCH,
    showGitStatus:
      projectTerminalConfig?.showGitStatus ??
      globalTerminalConfig?.showGitStatus ??
      DEFAULT_SHOW_GIT_STATUS,
    showUserHost:
      projectTerminalConfig?.showUserHost ??
      globalTerminalConfig?.showUserHost ??
      DEFAULT_SHOW_USER_HOST,
    showPath:
      projectTerminalConfig?.showPath ?? globalTerminalConfig?.showPath ?? DEFAULT_SHOW_PATH,
    pathStyle: normalizePathStyle(
      projectTerminalConfig?.pathStyle ?? globalTerminalConfig?.pathStyle
    ),
    pathDepth: normalizePathDepth(
      projectTerminalConfig?.pathDepth ?? globalTerminalConfig?.pathDepth
    ),
    showTime:
      projectTerminalConfig?.showTime ?? globalTerminalConfig?.showTime ?? DEFAULT_SHOW_TIME,
    showExitStatus:
      projectTerminalConfig?.showExitStatus ??
      globalTerminalConfig?.showExitStatus ??
      DEFAULT_SHOW_EXIT_STATUS,
    customAliases:
      projectTerminalConfig?.customAliases ??
      globalTerminalConfig?.customAliases ??
      DEFAULT_CUSTOM_ALIASES,
    customEnvVars: mergedEnvVars,
    rcFileVersion: globalTerminalConfig?.rcFileVersion,
  };
}

export interface TerminalSession {
  id: string;
  pty: pty.IPty;
  cwd: string;
  createdAt: Date;
  shell: string;
  scrollbackBuffer: string; // Store recent output for replay on reconnect
  outputBuffer: string; // Pending output to be flushed
  flushTimeout: NodeJS.Timeout | null; // Throttle timer
  resizeInProgress: boolean; // Flag to suppress scrollback during resize
  resizeDebounceTimeout: NodeJS.Timeout | null; // Resize settle timer
}

export interface TerminalOptions {
  cwd?: string;
  shell?: string;
  cols?: number;
  rows?: number;
  env?: Record<string, string>;
}

type DataCallback = (sessionId: string, data: string) => void;
type ExitCallback = (sessionId: string, exitCode: number) => void;

export class TerminalService extends EventEmitter {
  private sessions: Map<string, TerminalSession> = new Map();
  private dataCallbacks: Set<DataCallback> = new Set();
  private exitCallbacks: Set<ExitCallback> = new Set();
  private isWindows = os.platform() === 'win32';
  // On Windows, ConPTY requires AttachConsole which fails in Electron/service mode
  // Detect Electron by checking for electron-specific env vars or process properties
  private isElectron =
    !!(process.versions && (process.versions as Record<string, string>).electron) ||
    !!process.env.ELECTRON_RUN_AS_NODE;
  private useConptyFallback = false; // Track if we need to use winpty fallback on Windows
  private settingsService: SettingsService | null = null;

  constructor(settingsService?: SettingsService) {
    super();
    this.settingsService = settingsService || null;
  }

  /**
   * Kill a PTY process with platform-specific handling.
   * Windows doesn't support Unix signals like SIGTERM/SIGKILL, so we call kill() without arguments.
   * On Unix-like systems (macOS, Linux), we can specify the signal.
   *
   * @param ptyProcess - The PTY process to kill
   * @param signal - The signal to send on Unix-like systems (default: 'SIGTERM')
   */
  private killPtyProcess(ptyProcess: pty.IPty, signal: string = 'SIGTERM'): void {
    if (this.isWindows) {
      ptyProcess.kill();
    } else {
      ptyProcess.kill(signal);
    }
  }

  /**
   * Detect the best shell for the current platform
   * Uses getShellPaths() to iterate through allowed shell paths
   */
  detectShell(): { shell: string; args: string[] } {
    const platform = os.platform();
    const shellPaths = getShellPaths();

    // Check if running in WSL - prefer user's shell or bash with --login
    if (platform === 'linux' && this.isWSL()) {
      const userShell = process.env.SHELL;
      if (userShell) {
        // Try to find userShell in allowed paths
        for (const allowedShell of shellPaths) {
          if (
            allowedShell === userShell ||
            getShellBasename(allowedShell) === getShellBasename(userShell)
          ) {
            try {
              if (systemPathExists(allowedShell)) {
                return { shell: allowedShell, args: getShellArgsForPath(allowedShell) };
              }
            } catch {
              // Path not allowed, continue searching
            }
          }
        }
      }
      // Fall back to first available POSIX shell
      for (const shell of shellPaths) {
        try {
          if (systemPathExists(shell)) {
            return { shell, args: getShellArgsForPath(shell) };
          }
        } catch {
          // Path not allowed, continue
        }
      }
      return { shell: '/bin/bash', args: ['--login'] };
    }

    // For all platforms: first try user's shell if set
    const userShell = process.env.SHELL;
    if (userShell && platform !== 'win32') {
      // Try to find userShell in allowed paths
      for (const allowedShell of shellPaths) {
        if (
          allowedShell === userShell ||
          getShellBasename(allowedShell) === getShellBasename(userShell)
        ) {
          try {
            if (systemPathExists(allowedShell)) {
              return { shell: allowedShell, args: getShellArgsForPath(allowedShell) };
            }
          } catch {
            // Path not allowed, continue searching
          }
        }
      }
    }

    // Iterate through allowed shell paths and return first existing one
    for (const shell of shellPaths) {
      try {
        if (systemPathExists(shell)) {
          return { shell, args: getShellArgsForPath(shell) };
        }
      } catch {
        // Path not allowed or doesn't exist, continue to next
      }
    }

    // Ultimate fallbacks based on platform
    if (platform === 'win32') {
      return { shell: 'cmd.exe', args: [] };
    }
    return { shell: '/bin/sh', args: [] };
  }

  /**
   * Detect if running inside WSL (Windows Subsystem for Linux)
   */
  isWSL(): boolean {
    try {
      // Check /proc/version for Microsoft/WSL indicators
      const wslVersionPath = getWslVersionPath();
      if (systemPathExists(wslVersionPath)) {
        const version = systemPathReadFileSync(wslVersionPath, 'utf-8').toLowerCase();
        return version.includes('microsoft') || version.includes('wsl');
      }
      // Check for WSL environment variable
      if (process.env.WSL_DISTRO_NAME || process.env.WSLENV) {
        return true;
      }
    } catch {
      // Ignore errors
    }
    return false;
  }

  /**
   * Get platform info for the client
   */
  getPlatformInfo(): {
    platform: string;
    isWSL: boolean;
    defaultShell: string;
    arch: string;
  } {
    const { shell } = this.detectShell();
    return {
      platform: os.platform(),
      isWSL: this.isWSL(),
      defaultShell: shell,
      arch: os.arch(),
    };
  }

  /**
   * Validate and resolve a working directory path
   * Includes basic sanitization against null bytes and path normalization
   * Uses secureFs to enforce ALLOWED_ROOT_DIRECTORY for user-provided paths
   */
  private async resolveWorkingDirectory(requestedCwd?: string): Promise<string> {
    const homeDir = os.homedir();

    // If no cwd requested, use home
    if (!requestedCwd) {
      return homeDir;
    }

    // Clean up the path
    let cwd = requestedCwd.trim();

    // Reject paths with null bytes (could bypass path checks)
    if (cwd.includes('\0')) {
      logger.warn(`Rejecting path with null byte: ${cwd.replace(/\0/g, '\\0')}`);
      return homeDir;
    }

    // Fix double slashes at start (but not for Windows UNC paths)
    if (cwd.startsWith('//') && !cwd.startsWith('//wsl')) {
      cwd = cwd.slice(1);
    }

    // Normalize the path to resolve . and .. segments
    // Skip normalization for WSL UNC paths as path.resolve would break them
    if (!cwd.startsWith('//wsl')) {
      cwd = path.resolve(cwd);
    }

    // Check if path exists and is a directory
    // Using secureFs.stat to enforce ALLOWED_ROOT_DIRECTORY security boundary
    // This prevents terminals from being opened in directories outside the allowed workspace
    try {
      const statResult = await secureFs.stat(cwd);
      if (statResult.isDirectory()) {
        return cwd;
      }
      logger.warn(`Path exists but is not a directory: ${cwd}, falling back to home`);
      return homeDir;
    } catch {
      logger.warn(`Working directory does not exist or not allowed: ${cwd}, falling back to home`);
      return homeDir;
    }
  }

  /**
   * Get current session count
   */
  getSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Get maximum allowed sessions
   */
  getMaxSessions(): number {
    return maxSessions;
  }

  /**
   * Set maximum allowed sessions (can be called dynamically)
   */
  setMaxSessions(limit: number): void {
    if (limit >= MIN_MAX_SESSIONS && limit <= MAX_MAX_SESSIONS) {
      maxSessions = limit;
      logger.info(`Max sessions limit updated to ${limit}`);
    }
  }

  /**
   * Create a new terminal session
   * Returns null if the maximum session limit has been reached
   */
  async createSession(options: TerminalOptions = {}): Promise<TerminalSession | null> {
    // Check session limit
    if (this.sessions.size >= maxSessions) {
      logger.error(`Max sessions (${maxSessions}) reached, refusing new session`);
      return null;
    }

    const id = `term-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

    const { shell: detectedShell, args: detectedShellArgs } = this.detectShell();
    const shell = options.shell || detectedShell;
    let shellArgs = options.shell ? getShellArgsForPath(shell) : [...detectedShellArgs];

    // Validate and resolve working directory
    // Uses secureFs internally to enforce ALLOWED_ROOT_DIRECTORY
    const cwd = await this.resolveWorkingDirectory(options.cwd);

    // Build environment with some useful defaults
    // These settings ensure consistent terminal behavior across platforms
    // First, create a clean copy of process.env excluding Automaker-specific variables
    // that could pollute user shells (e.g., PORT would affect Next.js/other dev servers)
    const automakerEnvVars = ['PORT', 'DATA_DIR', 'AUTOMAKER_API_KEY', 'NODE_PATH'];
    const cleanEnv: Record<string, string> = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined && !automakerEnvVars.includes(key)) {
        cleanEnv[key] = value;
      }
    }

    // Terminal config injection (custom prompts, themes)
    const terminalConfigEnv: Record<string, string> = {};
    if (this.settingsService) {
      try {
        logger.info(
          `[createSession] Checking terminal config for session ${id}, cwd: ${options.cwd || cwd}`
        );
        const globalSettings = await this.settingsService.getGlobalSettings();
        const projectSettings = options.cwd
          ? await this.settingsService.getProjectSettings(options.cwd)
          : null;

        const globalTerminalConfig = globalSettings?.terminalConfig;
        const projectTerminalConfig = projectSettings?.terminalConfig;
        const effectiveConfig = buildEffectiveTerminalConfig(
          globalTerminalConfig,
          projectTerminalConfig
        );

        logger.info(
          `[createSession] Terminal config: global.enabled=${globalTerminalConfig?.enabled}, project.enabled=${projectTerminalConfig?.enabled}`
        );
        logger.info(
          `[createSession] Terminal config effective enabled: ${effectiveConfig.enabled}`
        );

        if (effectiveConfig.enabled && globalTerminalConfig) {
          const currentTheme = globalSettings?.theme || 'dark';
          const themeColors = getTerminalThemeColors(currentTheme);
          const allThemes = getAllTerminalThemes();
          const promptTheme =
            projectTerminalConfig?.promptTheme ?? globalTerminalConfig.promptTheme;
          const ompThemeName = resolveOmpThemeName(promptTheme);

          // Ensure RC files are up to date
          await ensureRcFilesUpToDate(
            options.cwd || cwd,
            currentTheme,
            effectiveConfig,
            themeColors,
            allThemes
          );

          // Set shell-specific env vars
          const shellName = getShellBasename(shell).toLowerCase();
          if (ompThemeName && effectiveConfig.customPrompt) {
            terminalConfigEnv[OMP_THEME_ENV_VAR] = ompThemeName;
          }

          if (shellName.includes(SHELL_NAME_BASH)) {
            const bashRcFilePath = getRcFilePath(options.cwd || cwd, SHELL_NAME_BASH);
            terminalConfigEnv.BASH_ENV = bashRcFilePath;
            terminalConfigEnv.AUTOMAKER_CUSTOM_PROMPT = effectiveConfig.customPrompt
              ? 'true'
              : 'false';
            terminalConfigEnv.AUTOMAKER_THEME = currentTheme;
            shellArgs = applyBashRcFileArgs(shellArgs, bashRcFilePath);
          } else if (shellName.includes(SHELL_NAME_ZSH)) {
            terminalConfigEnv.ZDOTDIR = getTerminalDir(options.cwd || cwd);
            terminalConfigEnv.AUTOMAKER_CUSTOM_PROMPT = effectiveConfig.customPrompt
              ? 'true'
              : 'false';
            terminalConfigEnv.AUTOMAKER_THEME = currentTheme;
          } else if (shellName === SHELL_NAME_SH) {
            terminalConfigEnv.ENV = getRcFilePath(options.cwd || cwd, SHELL_NAME_SH);
            terminalConfigEnv.AUTOMAKER_CUSTOM_PROMPT = effectiveConfig.customPrompt
              ? 'true'
              : 'false';
            terminalConfigEnv.AUTOMAKER_THEME = currentTheme;
          }

          // Add custom env vars from config
          Object.assign(terminalConfigEnv, effectiveConfig.customEnvVars);

          logger.info(
            `[createSession] Terminal config enabled for session ${id}, shell: ${shellName}`
          );
        }
      } catch (error) {
        logger.warn(`[createSession] Failed to apply terminal config: ${error}`);
      }
    }

    const env: Record<string, string> = {
      ...cleanEnv,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
      TERM_PROGRAM: 'automaker-terminal',
      // Ensure proper locale for character handling
      LANG: process.env.LANG || 'en_US.UTF-8',
      LC_ALL: process.env.LC_ALL || process.env.LANG || 'en_US.UTF-8',
      ...options.env,
      ...terminalConfigEnv, // Apply terminal config env vars last (highest priority)
    };

    logger.info(`Creating session ${id} with shell: ${shell} in ${cwd}`);

    // Build PTY spawn options
    const ptyOptions: pty.IPtyForkOptions = {
      name: 'xterm-256color',
      cols: options.cols || 80,
      rows: options.rows || 24,
      cwd,
      env,
    };

    // On Windows, always use winpty instead of ConPTY
    // ConPTY requires AttachConsole which fails in many contexts:
    // - Electron apps without a console
    // - VS Code integrated terminal
    // - Spawned from other applications
    // The error happens in a subprocess so we can't catch it - must proactively disable
    if (this.isWindows) {
      (ptyOptions as pty.IWindowsPtyForkOptions).useConpty = false;
      logger.info(
        `[createSession] Using winpty for session ${id} (ConPTY disabled for compatibility)`
      );
    }

    let ptyProcess: pty.IPty;
    try {
      ptyProcess = pty.spawn(shell, shellArgs, ptyOptions);
    } catch (spawnError) {
      const errorMessage = spawnError instanceof Error ? spawnError.message : String(spawnError);

      // Check for Windows ConPTY-specific errors
      if (this.isWindows && errorMessage.includes('AttachConsole failed')) {
        // ConPTY failed - try winpty fallback
        if (!this.useConptyFallback) {
          logger.warn(`[createSession] ConPTY AttachConsole failed, retrying with winpty fallback`);
          this.useConptyFallback = true;

          try {
            (ptyOptions as pty.IWindowsPtyForkOptions).useConpty = false;
            ptyProcess = pty.spawn(shell, shellArgs, ptyOptions);
            logger.info(`[createSession] Successfully spawned session ${id} with winpty fallback`);
          } catch (fallbackError) {
            const fallbackMessage =
              fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
            logger.error(`[createSession] Winpty fallback also failed:`, fallbackMessage);
            return null;
          }
        } else {
          logger.error(`[createSession] PTY spawn failed (winpty):`, errorMessage);
          return null;
        }
      } else {
        logger.error(`[createSession] PTY spawn failed:`, errorMessage);
        return null;
      }
    }

    const session: TerminalSession = {
      id,
      pty: ptyProcess,
      cwd,
      createdAt: new Date(),
      shell,
      scrollbackBuffer: '',
      outputBuffer: '',
      flushTimeout: null,
      resizeInProgress: false,
      resizeDebounceTimeout: null,
    };

    this.sessions.set(id, session);

    // Flush buffered output to clients (throttled)
    const flushOutput = () => {
      if (session.outputBuffer.length === 0) return;

      // Send in batches if buffer is large
      let dataToSend = session.outputBuffer;
      if (dataToSend.length > OUTPUT_BATCH_SIZE) {
        dataToSend = session.outputBuffer.slice(0, OUTPUT_BATCH_SIZE);
        session.outputBuffer = session.outputBuffer.slice(OUTPUT_BATCH_SIZE);
        // Schedule another flush for remaining data
        session.flushTimeout = setTimeout(flushOutput, OUTPUT_THROTTLE_MS);
      } else {
        session.outputBuffer = '';
        session.flushTimeout = null;
      }

      this.dataCallbacks.forEach((cb) => cb(id, dataToSend));
      this.emit('data', id, dataToSend);
    };

    // Forward data events with throttling
    ptyProcess.onData((data) => {
      // Skip ALL output during resize/reconnect to prevent prompt redraw duplication
      // This drops both scrollback AND live output during the suppression window
      // Without this, prompt redraws from SIGWINCH go to live clients causing duplicates
      if (session.resizeInProgress) {
        return;
      }

      // Append to scrollback buffer
      session.scrollbackBuffer += data;
      // Trim if too large (keep the most recent data)
      if (session.scrollbackBuffer.length > MAX_SCROLLBACK_SIZE) {
        session.scrollbackBuffer = session.scrollbackBuffer.slice(-MAX_SCROLLBACK_SIZE);
      }

      // Buffer output for throttled live delivery
      session.outputBuffer += data;

      // Schedule flush if not already scheduled
      if (!session.flushTimeout) {
        session.flushTimeout = setTimeout(flushOutput, OUTPUT_THROTTLE_MS);
      }
    });

    // Handle exit
    ptyProcess.onExit(({ exitCode }) => {
      const exitMessage =
        exitCode === undefined || exitCode === null
          ? 'Session terminated'
          : `Session exited with code ${exitCode}`;
      logger.info(`${exitMessage} (${id})`);
      this.sessions.delete(id);
      this.exitCallbacks.forEach((cb) => cb(id, exitCode));
      this.emit('exit', id, exitCode);
    });

    logger.info(`Session ${id} created successfully`);
    return session;
  }

  /**
   * Write data to a terminal session
   */
  write(sessionId: string, data: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      logger.warn(`Session ${sessionId} not found`);
      return false;
    }
    session.pty.write(data);
    return true;
  }

  /**
   * Resize a terminal session
   * @param suppressOutput - If true, suppress output during resize to prevent duplicate prompts.
   *                         Should be false for the initial resize so the first prompt isn't dropped.
   */
  resize(sessionId: string, cols: number, rows: number, suppressOutput: boolean = true): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      logger.warn(`Session ${sessionId} not found for resize`);
      return false;
    }
    try {
      // Only suppress output on subsequent resizes, not the initial one
      // This prevents the shell's first prompt from being dropped
      if (suppressOutput) {
        session.resizeInProgress = true;
        if (session.resizeDebounceTimeout) {
          clearTimeout(session.resizeDebounceTimeout);
        }
      }

      session.pty.resize(cols, rows);

      // Clear resize flag after a delay (allow prompt to settle)
      // 150ms is enough for most prompts - longer causes sluggish feel
      if (suppressOutput) {
        session.resizeDebounceTimeout = setTimeout(() => {
          session.resizeInProgress = false;
          session.resizeDebounceTimeout = null;
        }, 150);
      }

      return true;
    } catch (error) {
      logger.error(`Error resizing session ${sessionId}:`, error);
      session.resizeInProgress = false; // Clear flag on error
      return false;
    }
  }

  /**
   * Kill a terminal session
   * Attempts graceful SIGTERM first, then SIGKILL after 1 second if still alive
   */
  killSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }
    try {
      // Clean up flush timeout
      if (session.flushTimeout) {
        clearTimeout(session.flushTimeout);
        session.flushTimeout = null;
      }
      // Clean up resize debounce timeout
      if (session.resizeDebounceTimeout) {
        clearTimeout(session.resizeDebounceTimeout);
        session.resizeDebounceTimeout = null;
      }

      // First try graceful SIGTERM to allow process cleanup
      // On Windows, killPtyProcess calls kill() without signal since Windows doesn't support Unix signals
      logger.info(`Session ${sessionId} sending SIGTERM`);
      this.killPtyProcess(session.pty, 'SIGTERM');

      // Schedule SIGKILL fallback if process doesn't exit gracefully
      // The onExit handler will remove session from map when it actually exits
      setTimeout(() => {
        if (this.sessions.has(sessionId)) {
          logger.info(`Session ${sessionId} still alive after SIGTERM, sending SIGKILL`);
          try {
            this.killPtyProcess(session.pty, 'SIGKILL');
          } catch {
            // Process may have already exited
          }
          // Force remove from map if still present
          this.sessions.delete(sessionId);
        }
      }, 1000);

      logger.info(`Session ${sessionId} kill initiated`);
      return true;
    } catch (error) {
      logger.error(`Error killing session ${sessionId}:`, error);
      // Still try to remove from map even if kill fails
      this.sessions.delete(sessionId);
      return false;
    }
  }

  /**
   * Get a session by ID
   */
  getSession(sessionId: string): TerminalSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get scrollback buffer for a session (for replay on reconnect)
   */
  getScrollback(sessionId: string): string | null {
    const session = this.sessions.get(sessionId);
    return session?.scrollbackBuffer || null;
  }

  /**
   * Get scrollback buffer and clear pending output buffer to prevent duplicates
   * Call this when establishing a new WebSocket connection
   * This prevents data that's already in scrollback from being sent again via data callback
   */
  getScrollbackAndClearPending(sessionId: string): string | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    // Clear any pending output that hasn't been flushed yet
    // This data is already in scrollbackBuffer
    session.outputBuffer = '';
    if (session.flushTimeout) {
      clearTimeout(session.flushTimeout);
      session.flushTimeout = null;
    }

    // NOTE: Don't set resizeInProgress here - it causes blank terminals
    // if the shell hasn't output its prompt yet when WebSocket connects.
    // The resize() method handles suppression during actual resize events.

    return session.scrollbackBuffer || null;
  }

  /**
   * Get all active sessions
   */
  getAllSessions(): Array<{
    id: string;
    cwd: string;
    createdAt: Date;
    shell: string;
  }> {
    return Array.from(this.sessions.values()).map((s) => ({
      id: s.id,
      cwd: s.cwd,
      createdAt: s.createdAt,
      shell: s.shell,
    }));
  }

  /**
   * Subscribe to data events
   */
  onData(callback: DataCallback): () => void {
    this.dataCallbacks.add(callback);
    return () => this.dataCallbacks.delete(callback);
  }

  /**
   * Subscribe to exit events
   */
  onExit(callback: ExitCallback): () => void {
    this.exitCallbacks.add(callback);
    return () => this.exitCallbacks.delete(callback);
  }

  /**
   * Handle theme change - regenerate RC files with new theme colors
   */
  async onThemeChange(projectPath: string, newTheme: string): Promise<void> {
    if (!this.settingsService) {
      logger.warn('[onThemeChange] SettingsService not available');
      return;
    }

    try {
      const globalSettings = await this.settingsService.getGlobalSettings();
      const terminalConfig = globalSettings?.terminalConfig;
      const projectSettings = await this.settingsService.getProjectSettings(projectPath);
      const projectTerminalConfig = projectSettings?.terminalConfig;
      const effectiveConfig = buildEffectiveTerminalConfig(terminalConfig, projectTerminalConfig);

      if (effectiveConfig.enabled && terminalConfig) {
        const themeColors = getTerminalThemeColors(
          newTheme as import('@automaker/types').ThemeMode
        );
        const allThemes = getAllTerminalThemes();

        // Regenerate RC files with new theme
        await ensureRcFilesUpToDate(
          projectPath,
          newTheme as import('@automaker/types').ThemeMode,
          effectiveConfig,
          themeColors,
          allThemes
        );

        logger.info(`[onThemeChange] Regenerated RC files for theme: ${newTheme}`);
      }
    } catch (error) {
      logger.error(`[onThemeChange] Failed to regenerate RC files: ${error}`);
    }
  }

  /**
   * Clean up all sessions
   */
  cleanup(): void {
    logger.info(`Cleaning up ${this.sessions.size} sessions`);
    this.sessions.forEach((session, id) => {
      try {
        // Clean up flush timeout
        if (session.flushTimeout) {
          clearTimeout(session.flushTimeout);
        }
        // Use platform-specific kill to ensure proper termination on Windows
        this.killPtyProcess(session.pty);
      } catch {
        // Ignore errors during cleanup
      }
      this.sessions.delete(id);
    });
  }
}

// Singleton instance
let terminalService: TerminalService | null = null;

export function getTerminalService(settingsService?: SettingsService): TerminalService {
  if (!terminalService) {
    terminalService = new TerminalService(settingsService);
  }
  return terminalService;
}
