/**
 * POST /start-tests endpoint - Start tests for a worktree
 *
 * Runs the test command configured in project settings.
 * If no testCommand is configured, returns an error.
 */

import type { Request, Response } from 'express';
import type { SettingsService } from '../../../services/settings-service.js';
import { getTestRunnerService } from '../../../services/test-runner-service.js';
import { getErrorMessage, logError } from '../common.js';

export function createStartTestsHandler(settingsService?: SettingsService) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const body = req.body;

      // Validate request body
      if (!body || typeof body !== 'object') {
        res.status(400).json({
          success: false,
          error: 'Request body must be an object',
        });
        return;
      }

      const worktreePath = typeof body.worktreePath === 'string' ? body.worktreePath : undefined;
      const projectPath = typeof body.projectPath === 'string' ? body.projectPath : undefined;
      const testFile = typeof body.testFile === 'string' ? body.testFile : undefined;

      if (!worktreePath) {
        res.status(400).json({
          success: false,
          error: 'worktreePath is required and must be a string',
        });
        return;
      }

      // Get project settings to find the test command
      // Use projectPath if provided, otherwise use worktreePath
      const settingsPath = projectPath || worktreePath;

      if (!settingsService) {
        res.status(500).json({
          success: false,
          error: 'Settings service not available',
        });
        return;
      }

      const projectSettings = await settingsService.getProjectSettings(settingsPath);
      const testCommand = projectSettings?.testCommand;

      if (!testCommand) {
        res.status(400).json({
          success: false,
          error:
            'No test command configured. Please configure a test command in Project Settings > Testing Configuration.',
        });
        return;
      }

      const testRunnerService = getTestRunnerService();
      const result = await testRunnerService.startTests(worktreePath, {
        command: testCommand,
        testFile,
      });

      if (result.success && result.result) {
        res.json({
          success: true,
          result: {
            sessionId: result.result.sessionId,
            worktreePath: result.result.worktreePath,
            command: result.result.command,
            status: result.result.status,
            testFile: result.result.testFile,
            message: result.result.message,
          },
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error || 'Failed to start tests',
        });
      }
    } catch (error) {
      logError(error, 'Start tests failed');
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}
