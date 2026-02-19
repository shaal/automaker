/**
 * POST /deauth-gemini endpoint - Disconnect Gemini CLI from the app
 */

import type { Request, Response } from 'express';
import { getErrorMessage, logError } from '../common.js';
import * as fs from 'fs/promises';
import * as path from 'path';

const DISCONNECTED_MARKER_FILE = '.gemini-disconnected';

/**
 * Creates handler for POST /api/setup/deauth-gemini
 * Creates a marker file to disconnect Gemini CLI from the app
 */
export function createDeauthGeminiHandler() {
  return async (_req: Request, res: Response): Promise<void> => {
    try {
      const projectRoot = process.cwd();
      const automakerDir = path.join(projectRoot, '.automaker');

      // Ensure .automaker directory exists
      await fs.mkdir(automakerDir, { recursive: true });

      const markerPath = path.join(automakerDir, DISCONNECTED_MARKER_FILE);

      // Create the disconnection marker
      await fs.writeFile(markerPath, 'Gemini CLI disconnected from app');

      res.json({
        success: true,
        message: 'Gemini CLI disconnected from app',
      });
    } catch (error) {
      logError(error, 'Deauth Gemini failed');
      res.status(500).json({
        success: false,
        error: getErrorMessage(error),
      });
    }
  };
}
