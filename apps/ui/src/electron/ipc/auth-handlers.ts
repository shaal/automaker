/**
 * Auth IPC handlers
 *
 * Handles authentication-related operations.
 */

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from './channels';
import { state } from '../state';

/**
 * Register auth IPC handlers
 */
export function registerAuthHandlers(): void {
  // Get API key for authentication
  // Returns null in external server mode to trigger session-based auth
  // Only returns API key to the main window to prevent leaking to untrusted senders
  ipcMain.handle(IPC_CHANNELS.AUTH.GET_API_KEY, (event) => {
    // Validate sender is the main window
    if (event.sender !== state.mainWindow?.webContents) {
      return null;
    }
    if (state.isExternalServerMode) {
      return null;
    }
    return state.apiKey;
  });

  // Check if running in external server mode (Docker API)
  // Used by renderer to determine auth flow
  ipcMain.handle(IPC_CHANNELS.AUTH.IS_EXTERNAL_SERVER_MODE, () => {
    return state.isExternalServerMode;
  });
}
