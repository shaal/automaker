/**
 * IPC handlers aggregator
 *
 * Registers all IPC handlers in one place.
 */

import { registerDialogHandlers } from './dialog-handlers';
import { registerShellHandlers } from './shell-handlers';
import { registerAppHandlers } from './app-handlers';
import { registerAuthHandlers } from './auth-handlers';
import { registerWindowHandlers } from './window-handlers';
import { registerServerHandlers } from './server-handlers';

export { IPC_CHANNELS } from './channels';

/**
 * Register all IPC handlers
 */
export function registerAllHandlers(): void {
  registerDialogHandlers();
  registerShellHandlers();
  registerAppHandlers();
  registerAuthHandlers();
  registerWindowHandlers();
  registerServerHandlers();
}
