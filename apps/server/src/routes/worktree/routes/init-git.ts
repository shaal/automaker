/**
 * POST /init-git endpoint - Initialize a git repository in a directory
 */

import type { Request, Response } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as secureFs from '../../../lib/secure-fs.js';
import { join } from 'path';
import { getErrorMessage, logError } from '../common.js';

const execAsync = promisify(exec);

export function createInitGitHandler() {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectPath } = req.body as {
        projectPath: string;
      };

      if (!projectPath) {
        res.status(400).json({
          success: false,
          error: 'projectPath required',
        });
        return;
      }

      // Check if .git already exists
      const gitDirPath = join(projectPath, '.git');
      try {
        await secureFs.access(gitDirPath);
        // .git exists
        res.json({
          success: true,
          result: {
            initialized: false,
            message: 'Git repository already exists',
          },
        });
        return;
      } catch {
        // .git doesn't exist, continue with initialization
      }

      // Initialize git with 'main' as the default branch (matching GitHub's standard since 2020)
      // and create an initial empty commit
      await execAsync(
        `git init --initial-branch=main && git commit --allow-empty -m "Initial commit"`,
        {
          cwd: projectPath,
        }
      );

      res.json({
        success: true,
        result: {
          initialized: true,
          message: 'Git repository initialized with initial commit',
        },
      });
    } catch (error) {
      logError(error, 'Init git failed');
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}
