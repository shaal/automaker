/**
 * Electron preload script (TypeScript)
 *
 * Only exposes native features (dialogs, shell) and server URL.
 * All other operations go through HTTP API.
 */

import { contextBridge, ipcRenderer, OpenDialogOptions, SaveDialogOptions } from 'electron';
import { createLogger } from '@automaker/utils/logger';
import { IPC_CHANNELS } from './electron/ipc/channels';

const logger = createLogger('Preload');

// Expose minimal API for native features
contextBridge.exposeInMainWorld('electronAPI', {
  // Platform info
  platform: process.platform,
  isElectron: true,

  // Connection check
  ping: (): Promise<string> => ipcRenderer.invoke(IPC_CHANNELS.PING),

  // Get server URL for HTTP client
  getServerUrl: (): Promise<string> => ipcRenderer.invoke(IPC_CHANNELS.SERVER.GET_URL),

  // Get API key for authentication
  getApiKey: (): Promise<string | null> => ipcRenderer.invoke(IPC_CHANNELS.AUTH.GET_API_KEY),

  // Check if running in external server mode (Docker API)
  isExternalServerMode: (): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.AUTH.IS_EXTERNAL_SERVER_MODE),

  // Native dialogs - better UX than prompt()
  openDirectory: (): Promise<Electron.OpenDialogReturnValue> =>
    ipcRenderer.invoke(IPC_CHANNELS.DIALOG.OPEN_DIRECTORY),
  openFile: (options?: OpenDialogOptions): Promise<Electron.OpenDialogReturnValue> =>
    ipcRenderer.invoke(IPC_CHANNELS.DIALOG.OPEN_FILE, options),
  saveFile: (options?: SaveDialogOptions): Promise<Electron.SaveDialogReturnValue> =>
    ipcRenderer.invoke(IPC_CHANNELS.DIALOG.SAVE_FILE, options),

  // Shell operations
  openExternalLink: (url: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke(IPC_CHANNELS.SHELL.OPEN_EXTERNAL, url),
  openPath: (filePath: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke(IPC_CHANNELS.SHELL.OPEN_PATH, filePath),
  openInEditor: (
    filePath: string,
    line?: number,
    column?: number
  ): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke(IPC_CHANNELS.SHELL.OPEN_IN_EDITOR, filePath, line, column),

  // App info
  getPath: (name: string): Promise<string> => ipcRenderer.invoke(IPC_CHANNELS.APP.GET_PATH, name),
  getVersion: (): Promise<string> => ipcRenderer.invoke(IPC_CHANNELS.APP.GET_VERSION),
  isPackaged: (): Promise<boolean> => ipcRenderer.invoke(IPC_CHANNELS.APP.IS_PACKAGED),

  // Window management
  updateMinWidth: (sidebarExpanded: boolean): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.WINDOW.UPDATE_MIN_WIDTH, sidebarExpanded),

  // App control
  quit: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.APP.QUIT),
});

logger.info('Electron API exposed (TypeScript)');
