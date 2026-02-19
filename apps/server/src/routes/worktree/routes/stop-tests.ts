/**
 * POST /stop-tests endpoint - Stop a running test session
 *
 * Stops the test runner process for a specific session,
 * cancelling any ongoing tests and freeing up resources.
 */

import type { Request, Response } from 'express';
import { getTestRunnerService } from '../../../services/test-runner-service.js';
import { getErrorMessage, logError } from '../common.js';

export function createStopTestsHandler() {
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

      const sessionId = typeof body.sessionId === 'string' ? body.sessionId : undefined;

      if (!sessionId) {
        res.status(400).json({
          success: false,
          error: 'sessionId is required and must be a string',
        });
        return;
      }

      const testRunnerService = getTestRunnerService();
      const result = await testRunnerService.stopTests(sessionId);

      if (result.success && result.result) {
        res.json({
          success: true,
          result: {
            sessionId: result.result.sessionId,
            message: result.result.message,
          },
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error || 'Failed to stop tests',
        });
      }
    } catch (error) {
      logError(error, 'Stop tests failed');
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}
