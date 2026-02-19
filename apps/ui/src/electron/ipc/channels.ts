/**
 * IPC channel constants
 *
 * Single source of truth for all IPC channel names.
 * Used by both main process handlers and preload script.
 */

export const IPC_CHANNELS = {
  DIALOG: {
    OPEN_DIRECTORY: 'dialog:openDirectory',
    OPEN_FILE: 'dialog:openFile',
    SAVE_FILE: 'dialog:saveFile',
  },
  SHELL: {
    OPEN_EXTERNAL: 'shell:openExternal',
    OPEN_PATH: 'shell:openPath',
    OPEN_IN_EDITOR: 'shell:openInEditor',
  },
  APP: {
    GET_PATH: 'app:getPath',
    GET_VERSION: 'app:getVersion',
    IS_PACKAGED: 'app:isPackaged',
    QUIT: 'app:quit',
  },
  AUTH: {
    GET_API_KEY: 'auth:getApiKey',
    IS_EXTERNAL_SERVER_MODE: 'auth:isExternalServerMode',
  },
  WINDOW: {
    UPDATE_MIN_WIDTH: 'window:updateMinWidth',
  },
  SERVER: {
    GET_URL: 'server:getUrl',
  },
  PING: 'ping',
} as const;
