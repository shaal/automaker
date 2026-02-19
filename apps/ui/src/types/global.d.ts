/**
 * Global type augmentations for Window interface
 *
 * These augmentations extend the Window interface with properties
 * used in testing and development contexts.
 */

import type { Feature } from '@automaker/types';
import type { ElectronAPI } from '../lib/electron';

/**
 * Mock context file data for testing
 */
interface MockContextFile {
  featureId: string;
  path: string;
  content: string;
}

/**
 * Mock project data for testing
 */
export interface MockProject {
  id: string;
  name?: string;
  path: string;
  lastOpened?: string;
}

declare global {
  interface Window {
    /**
     * Mock features array used in E2E tests
     * Set via page.addInitScript() to simulate features loaded from disk
     */
    __mockFeatures?: Feature[];

    /**
     * Mock current project used in E2E tests
     * Set via page.addInitScript() to simulate the currently open project
     */
    __currentProject?: MockProject | null;

    /**
     * Mock context file data used in E2E tests
     * Set via page.addInitScript() to simulate agent output files
     */
    __mockContextFile?: MockContextFile;

    /**
     * Debug helper to check API mode
     */
    __checkApiMode?: () => void;

    /**
     * Electron API exposed via preload script
     */
    electronAPI?: ElectronAPI & {
      isElectron?: boolean;
      getServerUrl?: () => Promise<string>;
      getApiKey?: () => Promise<string | null>;
      isExternalServerMode?: () => Promise<boolean>;
      getPath?: (name: 'documents' | 'home' | 'appData' | 'userData') => Promise<string>;
    };
  }
}

export {};
