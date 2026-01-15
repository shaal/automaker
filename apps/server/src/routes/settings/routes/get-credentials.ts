/**
 * GET /api/settings/credentials - Get API key status (masked for security)
 *
 * Returns masked credentials showing which providers have keys configured.
 * Each provider shows: `{ configured: boolean, masked: string }`
 * Masked shows first 4 and last 4 characters for verification.
 *
 * Response: `{ "success": true, "credentials": { anthropic, google, openai } }`
 */

import type { Request, Response } from 'express';
import type { SettingsService } from '../../../services/settings-service.js';
import { getErrorMessage, logError } from '../common.js';

/**
 * Create handler factory for GET /api/settings/credentials
 *
 * @param settingsService - Instance of SettingsService for file I/O
 * @returns Express request handler
 */
export function createGetCredentialsHandler(settingsService: SettingsService) {
  return async (_req: Request, res: Response): Promise<void> => {
    try {
      const credentials = await settingsService.getMaskedCredentials();

      res.json({
        success: true,
        credentials,
      });
    } catch (error) {
      logError(error, 'Get credentials failed');
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}
