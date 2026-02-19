/**
 * Icon management utilities
 *
 * Functions for getting the application icon path.
 */

import path from 'path';
import { app } from 'electron';
import { electronAppExists } from '@automaker/platform';
import { createLogger } from '@automaker/utils/logger';

const logger = createLogger('IconManager');

/**
 * Get icon path - works in both dev and production, cross-platform
 * Uses centralized electronApp methods for path validation.
 */
export function getIconPath(): string | null {
  const isDev = !app.isPackaged;

  let iconFile: string;
  if (process.platform === 'win32') {
    iconFile = 'icon.ico';
  } else if (process.platform === 'darwin') {
    iconFile = 'logo_larger.png';
  } else {
    iconFile = 'logo_larger.png';
  }

  // __dirname is apps/ui/dist-electron (Vite bundles all into single file)
  const iconPath = isDev
    ? path.join(__dirname, '../public', iconFile)
    : path.join(__dirname, '../dist/public', iconFile);

  try {
    if (!electronAppExists(iconPath)) {
      logger.warn('Icon not found at:', iconPath);
      return null;
    }
  } catch (error) {
    logger.warn('Icon check failed:', iconPath, error);
    return null;
  }

  return iconPath;
}
