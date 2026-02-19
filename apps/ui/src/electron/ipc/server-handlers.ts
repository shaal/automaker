/**
 * Server IPC handlers
 *
 * Handles server-related operations.
 */

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from './channels';
import { state } from '../state';

/**
 * Register server IPC handlers
 */
export function registerServerHandlers(): void {
  // Get server URL for HTTP client
  ipcMain.handle(IPC_CHANNELS.SERVER.GET_URL, async () => {
    return `http://localhost:${state.serverPort}`;
  });

  // Ping - for connection check
  ipcMain.handle(IPC_CHANNELS.PING, async () => {
    return 'pong';
  });
}
