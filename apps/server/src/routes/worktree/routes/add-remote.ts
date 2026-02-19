/**
 * POST /add-remote endpoint - Add a new remote to a git repository
 *
 * Note: Git repository validation (isGitRepo, hasCommits) is handled by
 * the requireValidWorktree middleware in index.ts
 */

import type { Request, Response } from 'express';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { getErrorMessage, logWorktreeError } from '../common.js';

const execFileAsync = promisify(execFile);

/** Maximum allowed length for remote names */
const MAX_REMOTE_NAME_LENGTH = 250;

/** Maximum allowed length for remote URLs */
const MAX_REMOTE_URL_LENGTH = 2048;

/** Timeout for git fetch operations (30 seconds) */
const FETCH_TIMEOUT_MS = 30000;

/**
 * Validate remote name - must be alphanumeric with dashes/underscores
 * Git remote names have similar restrictions to branch names
 */
function isValidRemoteName(name: string): boolean {
  // Remote names should be alphanumeric, may contain dashes, underscores, periods
  // Cannot start with a dash or period, cannot be empty
  if (!name || name.length === 0 || name.length > MAX_REMOTE_NAME_LENGTH) {
    return false;
  }
  return /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(name);
}

/**
 * Validate remote URL - basic validation for git remote URLs
 * Supports HTTPS, SSH, and git:// protocols
 */
function isValidRemoteUrl(url: string): boolean {
  if (!url || url.length === 0 || url.length > MAX_REMOTE_URL_LENGTH) {
    return false;
  }
  // Support common git URL formats:
  // - https://github.com/user/repo.git
  // - git@github.com:user/repo.git
  // - git://github.com/user/repo.git
  // - ssh://git@github.com/user/repo.git
  const httpsPattern = /^https?:\/\/.+/;
  const sshPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+:.+/;
  const gitProtocolPattern = /^git:\/\/.+/;
  const sshProtocolPattern = /^ssh:\/\/.+/;

  return (
    httpsPattern.test(url) ||
    sshPattern.test(url) ||
    gitProtocolPattern.test(url) ||
    sshProtocolPattern.test(url)
  );
}

export function createAddRemoteHandler() {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { worktreePath, remoteName, remoteUrl } = req.body as {
        worktreePath: string;
        remoteName: string;
        remoteUrl: string;
      };

      // Validate required fields
      const requiredFields = { worktreePath, remoteName, remoteUrl };
      for (const [key, value] of Object.entries(requiredFields)) {
        if (!value) {
          res.status(400).json({ success: false, error: `${key} required` });
          return;
        }
      }

      // Validate remote name
      if (!isValidRemoteName(remoteName)) {
        res.status(400).json({
          success: false,
          error:
            'Invalid remote name. Must start with alphanumeric character and contain only letters, numbers, dashes, underscores, or periods.',
        });
        return;
      }

      // Validate remote URL
      if (!isValidRemoteUrl(remoteUrl)) {
        res.status(400).json({
          success: false,
          error: 'Invalid remote URL. Must be a valid git URL (HTTPS, SSH, or git:// protocol).',
        });
        return;
      }

      // Check if remote already exists
      try {
        const { stdout: existingRemotes } = await execFileAsync('git', ['remote'], {
          cwd: worktreePath,
        });
        const remoteNames = existingRemotes
          .trim()
          .split('\n')
          .filter((r) => r.trim());
        if (remoteNames.includes(remoteName)) {
          res.status(400).json({
            success: false,
            error: `Remote '${remoteName}' already exists`,
            code: 'REMOTE_EXISTS',
          });
          return;
        }
      } catch (error) {
        // If git remote fails, continue with adding the remote. Log for debugging.
        logWorktreeError(
          error,
          'Checking for existing remotes failed, proceeding to add.',
          worktreePath
        );
      }

      // Add the remote using execFile with array arguments to prevent command injection
      await execFileAsync('git', ['remote', 'add', remoteName, remoteUrl], {
        cwd: worktreePath,
      });

      // Optionally fetch from the new remote to get its branches
      let fetchSucceeded = false;
      try {
        await execFileAsync('git', ['fetch', remoteName, '--quiet'], {
          cwd: worktreePath,
          timeout: FETCH_TIMEOUT_MS,
        });
        fetchSucceeded = true;
      } catch (fetchError) {
        // Fetch failed (maybe offline or invalid URL), but remote was added successfully
        logWorktreeError(
          fetchError,
          `Fetch from new remote '${remoteName}' failed (remote added successfully)`,
          worktreePath
        );
        fetchSucceeded = false;
      }

      res.json({
        success: true,
        result: {
          remoteName,
          remoteUrl,
          fetched: fetchSucceeded,
          message: fetchSucceeded
            ? `Successfully added remote '${remoteName}' and fetched its branches`
            : `Successfully added remote '${remoteName}' (fetch failed - you may need to fetch manually)`,
        },
      });
    } catch (error) {
      const worktreePath = req.body?.worktreePath;
      logWorktreeError(error, 'Add remote failed', worktreePath);
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}
