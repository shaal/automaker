/**
 * Window IPC handlers
 *
 * Handles window management operations.
 */

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from './channels';
import { MIN_WIDTH_COLLAPSED, MIN_HEIGHT } from '../constants';
import { state } from '../state';

/**
 * Register window IPC handlers
 */
export function registerWindowHandlers(): void {
  // Update minimum width based on sidebar state
  // Now uses a fixed small minimum since horizontal scrolling handles overflow
  ipcMain.handle(IPC_CHANNELS.WINDOW.UPDATE_MIN_WIDTH, (_, _sidebarExpanded: boolean) => {
    if (!state.mainWindow || state.mainWindow.isDestroyed()) return;

    // Always use the smaller minimum width - horizontal scrolling handles any overflow
    state.mainWindow.setMinimumSize(MIN_WIDTH_COLLAPSED, MIN_HEIGHT);
  });
}
