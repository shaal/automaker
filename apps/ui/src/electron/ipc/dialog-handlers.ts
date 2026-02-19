/**
 * Dialog IPC handlers
 *
 * Handles native file dialog operations.
 */

import { ipcMain, dialog } from 'electron';
import { isPathAllowed, getAllowedRootDirectory } from '@automaker/platform';
import { IPC_CHANNELS } from './channels';
import { state } from '../state';

/**
 * Register dialog IPC handlers
 */
export function registerDialogHandlers(): void {
  // Open directory dialog
  ipcMain.handle(IPC_CHANNELS.DIALOG.OPEN_DIRECTORY, async () => {
    if (!state.mainWindow) {
      return { canceled: true, filePaths: [] };
    }
    const result = await dialog.showOpenDialog(state.mainWindow, {
      properties: ['openDirectory', 'createDirectory'],
    });

    // Validate selected path against ALLOWED_ROOT_DIRECTORY if configured
    if (!result.canceled && result.filePaths.length > 0) {
      const selectedPath = result.filePaths[0];
      if (!isPathAllowed(selectedPath)) {
        const allowedRoot = getAllowedRootDirectory();
        const errorMessage = allowedRoot
          ? `The selected directory is not allowed. Please select a directory within: ${allowedRoot}`
          : 'The selected directory is not allowed.';

        dialog.showErrorBox('Directory Not Allowed', errorMessage);

        return { canceled: true, filePaths: [] };
      }
    }

    return result;
  });

  // Open file dialog
  // Filter properties to maintain file-only intent and prevent renderer from requesting directories
  ipcMain.handle(
    IPC_CHANNELS.DIALOG.OPEN_FILE,
    async (_, options: Record<string, unknown> = {}) => {
      if (!state.mainWindow) {
        return { canceled: true, filePaths: [] };
      }
      // Ensure openFile is always present and filter out directory-related properties
      const inputProperties = (options.properties as string[]) ?? [];
      const properties = ['openFile', ...inputProperties].filter(
        (p) => p !== 'openDirectory' && p !== 'createDirectory'
      );
      const result = await dialog.showOpenDialog(state.mainWindow, {
        ...options,
        properties: properties as Electron.OpenDialogOptions['properties'],
      });
      return result;
    }
  );

  // Save file dialog
  ipcMain.handle(IPC_CHANNELS.DIALOG.SAVE_FILE, async (_, options = {}) => {
    if (!state.mainWindow) {
      return { canceled: true, filePath: undefined };
    }
    const result = await dialog.showSaveDialog(state.mainWindow, options);
    return result;
  });
}
