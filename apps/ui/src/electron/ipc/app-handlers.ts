/**
 * App IPC handlers
 *
 * Handles app-related operations like getting paths, version info, and quitting.
 */

import { ipcMain, app } from 'electron';
import { createLogger } from '@automaker/utils/logger';
import { IPC_CHANNELS } from './channels';

const logger = createLogger('AppHandlers');

/**
 * Register app IPC handlers
 */
export function registerAppHandlers(): void {
  // Get app path
  ipcMain.handle(IPC_CHANNELS.APP.GET_PATH, async (_, name: Parameters<typeof app.getPath>[0]) => {
    return app.getPath(name);
  });

  // Get app version
  ipcMain.handle(IPC_CHANNELS.APP.GET_VERSION, async () => {
    return app.getVersion();
  });

  // Check if app is packaged
  ipcMain.handle(IPC_CHANNELS.APP.IS_PACKAGED, async () => {
    return app.isPackaged;
  });

  // Quit the application
  ipcMain.handle(IPC_CHANNELS.APP.QUIT, () => {
    logger.info('Quitting application via IPC request');
    app.quit();
  });
}
