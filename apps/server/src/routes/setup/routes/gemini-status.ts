/**
 * GET /gemini-status endpoint - Get Gemini CLI installation and auth status
 */

import type { Request, Response } from 'express';
import { GeminiProvider } from '../../../providers/gemini-provider.js';
import { getErrorMessage, logError } from '../common.js';
import * as fs from 'fs/promises';
import * as path from 'path';

const DISCONNECTED_MARKER_FILE = '.gemini-disconnected';

async function isGeminiDisconnectedFromApp(): Promise<boolean> {
  try {
    const projectRoot = process.cwd();
    const markerPath = path.join(projectRoot, '.automaker', DISCONNECTED_MARKER_FILE);
    await fs.access(markerPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Creates handler for GET /api/setup/gemini-status
 * Returns Gemini CLI installation and authentication status
 */
export function createGeminiStatusHandler() {
  const installCommand = 'npm install -g @google/gemini-cli';
  const loginCommand = 'gemini';

  return async (_req: Request, res: Response): Promise<void> => {
    try {
      // Check if user has manually disconnected from the app
      if (await isGeminiDisconnectedFromApp()) {
        res.json({
          success: true,
          installed: true,
          version: null,
          path: null,
          auth: {
            authenticated: false,
            method: 'none',
            hasApiKey: false,
          },
          installCommand,
          loginCommand,
        });
        return;
      }

      const provider = new GeminiProvider();
      const status = await provider.detectInstallation();
      const auth = await provider.checkAuth();

      res.json({
        success: true,
        installed: status.installed,
        version: status.version || null,
        path: status.path || null,
        auth: {
          authenticated: auth.authenticated,
          method: auth.method,
          hasApiKey: auth.hasApiKey || false,
          hasEnvApiKey: auth.hasEnvApiKey || false,
          error: auth.error,
        },
        installCommand,
        loginCommand,
      });
    } catch (error) {
      logError(error, 'Get Gemini status failed');
      res.status(500).json({
        success: false,
        error: getErrorMessage(error),
      });
    }
  };
}
