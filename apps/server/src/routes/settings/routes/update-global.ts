/**
 * PUT /api/settings/global - Update global user settings
 *
 * Accepts partial GlobalSettings update. Fields provided are merged into
 * existing settings (not replaced). Returns updated settings.
 *
 * Request body: `Partial<GlobalSettings>`
 * Response: `{ "success": true, "settings": GlobalSettings }`
 */

import type { Request, Response } from 'express';
import type { SettingsService } from '../../../services/settings-service.js';
import type { GlobalSettings } from '../../../types/settings.js';
import { getErrorMessage, logError, logger } from '../common.js';
import { setLogLevel, LogLevel } from '@automaker/utils';
import { setRequestLoggingEnabled } from '../../../index.js';
import { getTerminalService } from '../../../services/terminal-service.js';

/**
 * Map server log level string to LogLevel enum
 */
const LOG_LEVEL_MAP: Record<string, LogLevel> = {
  error: LogLevel.ERROR,
  warn: LogLevel.WARN,
  info: LogLevel.INFO,
  debug: LogLevel.DEBUG,
};

/**
 * Create handler factory for PUT /api/settings/global
 *
 * @param settingsService - Instance of SettingsService for file I/O
 * @returns Express request handler
 */
export function createUpdateGlobalHandler(settingsService: SettingsService) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const updates = req.body as Partial<GlobalSettings>;

      if (!updates || typeof updates !== 'object') {
        res.status(400).json({
          success: false,
          error: 'Invalid request body - expected settings object',
        });
        return;
      }

      // Minimal debug logging to help diagnose accidental wipes.
      const projectsLen = Array.isArray((updates as any).projects)
        ? (updates as any).projects.length
        : undefined;
      const trashedLen = Array.isArray((updates as any).trashedProjects)
        ? (updates as any).trashedProjects.length
        : undefined;
      logger.info(
        `[SERVER_SETTINGS_UPDATE] Request received: projects=${projectsLen ?? 'n/a'}, trashedProjects=${trashedLen ?? 'n/a'}, theme=${
          (updates as any).theme ?? 'n/a'
        }, localStorageMigrated=${(updates as any).localStorageMigrated ?? 'n/a'}`
      );

      // Get old settings to detect theme changes
      const oldSettings = await settingsService.getGlobalSettings();
      const oldTheme = oldSettings?.theme;

      logger.info('[SERVER_SETTINGS_UPDATE] Calling updateGlobalSettings...');
      const settings = await settingsService.updateGlobalSettings(updates);
      logger.info(
        '[SERVER_SETTINGS_UPDATE] Update complete, projects count:',
        settings.projects?.length ?? 0
      );

      // Handle theme change - regenerate terminal RC files for all projects
      if ('theme' in updates && updates.theme && updates.theme !== oldTheme) {
        const terminalService = getTerminalService(settingsService);
        const newTheme = updates.theme;

        logger.info(
          `[TERMINAL_CONFIG] Theme changed from ${oldTheme} to ${newTheme}, regenerating RC files`
        );

        // Regenerate RC files for all projects with terminal config enabled
        const projects = settings.projects || [];
        for (const project of projects) {
          try {
            const projectSettings = await settingsService.getProjectSettings(project.path);
            // Check if terminal config is enabled (global or project-specific)
            const terminalConfigEnabled =
              projectSettings.terminalConfig?.enabled !== false &&
              settings.terminalConfig?.enabled === true;

            if (terminalConfigEnabled) {
              await terminalService.onThemeChange(project.path, newTheme);
              logger.info(`[TERMINAL_CONFIG] Regenerated RC files for project: ${project.name}`);
            }
          } catch (error) {
            logger.warn(
              `[TERMINAL_CONFIG] Failed to regenerate RC files for project ${project.name}: ${error}`
            );
          }
        }
      }

      // Apply server log level if it was updated
      if ('serverLogLevel' in updates && updates.serverLogLevel) {
        const level = LOG_LEVEL_MAP[updates.serverLogLevel];
        if (level !== undefined) {
          setLogLevel(level);
          logger.info(`Server log level changed to: ${updates.serverLogLevel}`);
        }
      }

      // Apply request logging setting if it was updated
      if ('enableRequestLogging' in updates && typeof updates.enableRequestLogging === 'boolean') {
        setRequestLoggingEnabled(updates.enableRequestLogging);
        logger.info(
          `HTTP request logging ${updates.enableRequestLogging ? 'enabled' : 'disabled'}`
        );
      }

      res.json({
        success: true,
        settings,
      });
    } catch (error) {
      logError(error, 'Update global settings failed');
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}
