/**
 * POST /start-dev endpoint - Start a dev server for a worktree
 *
 * Spins up a development server in the worktree directory on a unique port,
 * allowing preview of the worktree's changes without affecting the main dev server.
 *
 * If a custom devCommand is configured in project settings, it will be used.
 * Otherwise, auto-detection based on package manager (npm/yarn/pnpm/bun run dev) is used.
 */

import type { Request, Response } from 'express';
import type { SettingsService } from '../../../services/settings-service.js';
import { getDevServerService } from '../../../services/dev-server-service.js';
import { getErrorMessage, logError } from '../common.js';
import { createLogger } from '@automaker/utils';

const logger = createLogger('start-dev');

export function createStartDevHandler(settingsService?: SettingsService) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectPath, worktreePath } = req.body as {
        projectPath: string;
        worktreePath: string;
      };

      if (!projectPath) {
        res.status(400).json({
          success: false,
          error: 'projectPath is required',
        });
        return;
      }

      if (!worktreePath) {
        res.status(400).json({
          success: false,
          error: 'worktreePath is required',
        });
        return;
      }

      // Get custom dev command from project settings (if configured)
      let customCommand: string | undefined;
      if (settingsService) {
        const projectSettings = await settingsService.getProjectSettings(projectPath);
        const devCommand = projectSettings?.devCommand?.trim();
        if (devCommand) {
          customCommand = devCommand;
          logger.debug(`Using custom dev command from project settings: ${customCommand}`);
        } else {
          logger.debug('No custom dev command configured, using auto-detection');
        }
      }

      const devServerService = getDevServerService();
      const result = await devServerService.startDevServer(
        projectPath,
        worktreePath,
        customCommand
      );

      if (result.success && result.result) {
        res.json({
          success: true,
          result: {
            worktreePath: result.result.worktreePath,
            port: result.result.port,
            url: result.result.url,
            message: result.result.message,
          },
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error || 'Failed to start dev server',
        });
      }
    } catch (error) {
      logError(error, 'Start dev server failed');
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}
