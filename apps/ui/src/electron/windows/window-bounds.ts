/**
 * Window bounds management
 *
 * Functions for loading, saving, and validating window bounds.
 * Uses centralized electronUserData methods for path validation.
 */

import { screen } from 'electron';
import {
  electronUserDataExists,
  electronUserDataReadFileSync,
  electronUserDataWriteFileSync,
} from '@automaker/platform';
import { createLogger } from '@automaker/utils/logger';
import {
  WindowBounds,
  WINDOW_BOUNDS_FILENAME,
  MIN_WIDTH_COLLAPSED,
  MIN_HEIGHT,
} from '../constants';
import { state } from '../state';

const logger = createLogger('WindowBounds');

/**
 * Load saved window bounds from disk
 * Uses centralized electronUserData methods for path validation.
 */
export function loadWindowBounds(): WindowBounds | null {
  try {
    if (electronUserDataExists(WINDOW_BOUNDS_FILENAME)) {
      const data = electronUserDataReadFileSync(WINDOW_BOUNDS_FILENAME);
      const bounds = JSON.parse(data) as WindowBounds;
      // Validate the loaded data has required fields
      if (
        typeof bounds.x === 'number' &&
        typeof bounds.y === 'number' &&
        typeof bounds.width === 'number' &&
        typeof bounds.height === 'number'
      ) {
        return bounds;
      }
    }
  } catch (error) {
    logger.warn('Failed to load window bounds:', (error as Error).message);
  }
  return null;
}

/**
 * Save window bounds to disk
 * Uses centralized electronUserData methods for path validation.
 */
export function saveWindowBounds(bounds: WindowBounds): void {
  try {
    electronUserDataWriteFileSync(WINDOW_BOUNDS_FILENAME, JSON.stringify(bounds, null, 2));
    logger.info('Window bounds saved');
  } catch (error) {
    logger.warn('Failed to save window bounds:', (error as Error).message);
  }
}

/**
 * Schedule a debounced save of window bounds (500ms delay)
 */
export function scheduleSaveWindowBounds(): void {
  if (!state.mainWindow || state.mainWindow.isDestroyed()) return;

  if (state.saveWindowBoundsTimeout) {
    clearTimeout(state.saveWindowBoundsTimeout);
  }

  state.saveWindowBoundsTimeout = setTimeout(() => {
    if (!state.mainWindow || state.mainWindow.isDestroyed()) return;

    const isMaximized = state.mainWindow.isMaximized();
    // Use getNormalBounds() for maximized windows to save pre-maximized size
    const bounds = isMaximized ? state.mainWindow.getNormalBounds() : state.mainWindow.getBounds();

    saveWindowBounds({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      isMaximized,
    });
  }, 500);
}

/**
 * Validate that window bounds are visible on at least one display
 * Returns adjusted bounds if needed, or null if completely off-screen
 */
export function validateBounds(bounds: WindowBounds): WindowBounds {
  const displays = screen.getAllDisplays();

  // Check if window center is visible on any display
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;

  let isVisible = false;
  for (const display of displays) {
    const { x, y, width, height } = display.workArea;
    if (centerX >= x && centerX <= x + width && centerY >= y && centerY <= y + height) {
      isVisible = true;
      break;
    }
  }

  if (!isVisible) {
    // Window is off-screen, reset to primary display
    const primaryDisplay = screen.getPrimaryDisplay();
    const { x, y, width, height } = primaryDisplay.workArea;

    return {
      x: x + Math.floor((width - bounds.width) / 2),
      y: y + Math.floor((height - bounds.height) / 2),
      width: Math.min(bounds.width, width),
      height: Math.min(bounds.height, height),
      isMaximized: bounds.isMaximized,
    };
  }

  // Ensure minimum dimensions
  return {
    ...bounds,
    width: Math.max(bounds.width, MIN_WIDTH_COLLAPSED),
    height: Math.max(bounds.height, MIN_HEIGHT),
  };
}
