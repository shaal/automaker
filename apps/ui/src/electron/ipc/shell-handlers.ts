/**
 * Shell IPC handlers
 *
 * Handles shell operations like opening external links and files.
 */

import { ipcMain, shell } from 'electron';
import { IPC_CHANNELS } from './channels';

/**
 * Register shell IPC handlers
 */
export function registerShellHandlers(): void {
  // Open external URL
  ipcMain.handle(IPC_CHANNELS.SHELL.OPEN_EXTERNAL, async (_, url: string) => {
    try {
      await shell.openExternal(url);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Open file path
  ipcMain.handle(IPC_CHANNELS.SHELL.OPEN_PATH, async (_, filePath: string) => {
    try {
      await shell.openPath(filePath);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Open file in editor (VS Code, etc.) with optional line/column
  ipcMain.handle(
    IPC_CHANNELS.SHELL.OPEN_IN_EDITOR,
    async (_, filePath: string, line?: number, column?: number) => {
      try {
        // Build VS Code URL scheme: vscode://file/path:line:column
        // This works on all platforms where VS Code is installed
        // URL encode the path to handle special characters (spaces, brackets, etc.)
        // Handle both Unix (/) and Windows (\) path separators
        const normalizedPath = filePath.replace(/\\/g, '/');
        const segments = normalizedPath.split('/').map(encodeURIComponent);
        const encodedPath = segments.join('/');
        // VS Code URL format requires a leading slash after 'file'
        let url = `vscode://file/${encodedPath}`;
        if (line !== undefined && line > 0) {
          url += `:${line}`;
          if (column !== undefined && column > 0) {
            url += `:${column}`;
          }
        }
        await shell.openExternal(url);
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    }
  );
}
