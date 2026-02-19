/**
 * Electron main process shared state
 *
 * Centralized state container to avoid circular dependencies.
 * All modules access shared state through this object.
 */

import { BrowserWindow } from 'electron';
import { ChildProcess } from 'child_process';
import { Server } from 'http';
import { DEFAULT_SERVER_PORT, DEFAULT_STATIC_PORT } from './constants';

export interface ElectronState {
  mainWindow: BrowserWindow | null;
  serverProcess: ChildProcess | null;
  staticServer: Server | null;
  serverPort: number;
  staticPort: number;
  apiKey: string | null;
  isExternalServerMode: boolean;
  saveWindowBoundsTimeout: ReturnType<typeof setTimeout> | null;
}

export const state: ElectronState = {
  mainWindow: null,
  serverProcess: null,
  staticServer: null,
  serverPort: DEFAULT_SERVER_PORT,
  staticPort: DEFAULT_STATIC_PORT,
  apiKey: null,
  isExternalServerMode: false,
  saveWindowBoundsTimeout: null,
};
