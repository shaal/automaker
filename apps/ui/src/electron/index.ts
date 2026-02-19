/**
 * Electron main process modules
 *
 * Re-exports for convenient importing.
 */

// Constants and types
export * from './constants';
export { state } from './state';

// Utilities
export { isPortAvailable, findAvailablePort } from './utils/port-manager';
export { getIconPath } from './utils/icon-manager';

// Security
export { ensureApiKey, getApiKey } from './security/api-key-manager';

// Windows
export {
  loadWindowBounds,
  saveWindowBounds,
  validateBounds,
  scheduleSaveWindowBounds,
} from './windows/window-bounds';
export { createWindow } from './windows/main-window';

// Server
export { startStaticServer, stopStaticServer } from './server/static-server';
export { startServer, waitForServer, stopServer } from './server/backend-server';

// IPC
export { IPC_CHANNELS, registerAllHandlers } from './ipc';
