/**
 * POST /merge endpoint - Merge feature (merge worktree branch into main)
 *
 * Note: Git repository validation (isGitRepo, hasCommits) is handled by
 * the requireValidProject middleware in index.ts
 */

import type { Request, Response } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getErrorMessage, logError } from '../common.js';

const execAsync = promisify(exec);

export function createMergeHandler() {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectPath, branchName, worktreePath, options } = req.body as {
        projectPath: string;
        branchName: string;
        worktreePath: string;
        options?: { squash?: boolean; message?: string };
      };

      if (!projectPath || !branchName || !worktreePath) {
        res.status(400).json({
          success: false,
          error: 'projectPath, branchName, and worktreePath are required',
        });
        return;
      }

      // Validate branch exists
      try {
        await execAsync(`git rev-parse --verify ${branchName}`, { cwd: projectPath });
      } catch {
        res.status(400).json({
          success: false,
          error: `Branch "${branchName}" does not exist`,
        });
        return;
      }

      // Merge the feature branch
      const mergeCmd = options?.squash
        ? `git merge --squash ${branchName}`
        : `git merge ${branchName} -m "${options?.message || `Merge ${branchName}`}"`;

      await execAsync(mergeCmd, { cwd: projectPath });

      // If squash merge, need to commit
      if (options?.squash) {
        await execAsync(`git commit -m "${options?.message || `Merge ${branchName} (squash)`}"`, {
          cwd: projectPath,
        });
      }

      // Clean up worktree and branch
      try {
        await execAsync(`git worktree remove "${worktreePath}" --force`, {
          cwd: projectPath,
        });
        await execAsync(`git branch -D ${branchName}`, { cwd: projectPath });
      } catch {
        // Cleanup errors are non-fatal
      }

      res.json({ success: true, mergedBranch: branchName });
    } catch (error) {
      logError(error, 'Merge worktree failed');
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}
