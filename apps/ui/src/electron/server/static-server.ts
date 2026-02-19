/**
 * Static file server for production builds
 *
 * Serves the built frontend files in production mode.
 * Uses centralized electronApp methods for serving static files from app bundle.
 */

import path from 'path';
import http from 'http';
import { electronAppExists, electronAppStat, electronAppReadFile } from '@automaker/platform';
import { createLogger } from '@automaker/utils/logger';
import { state } from '../state';

const logger = createLogger('StaticServer');

/**
 * MIME type mapping for static files
 */
const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
};

/**
 * Start static file server for production builds
 * Uses centralized electronApp methods for serving static files from app bundle.
 */
export async function startStaticServer(): Promise<void> {
  // __dirname is apps/ui/dist-electron (Vite bundles all into single file)
  const staticPath = path.join(__dirname, '../dist');

  state.staticServer = http.createServer((request, response) => {
    let filePath = path.join(staticPath, request.url?.split('?')[0] || '/');

    if (filePath.endsWith('/')) {
      filePath = path.join(filePath, 'index.html');
    } else if (!path.extname(filePath)) {
      // For client-side routing, serve index.html for paths without extensions
      const possibleFile = filePath + '.html';
      try {
        if (!electronAppExists(filePath) && !electronAppExists(possibleFile)) {
          filePath = path.join(staticPath, 'index.html');
        } else if (electronAppExists(possibleFile)) {
          filePath = possibleFile;
        }
      } catch {
        filePath = path.join(staticPath, 'index.html');
      }
    }

    electronAppStat(filePath, (err, stats) => {
      if (err || !stats?.isFile()) {
        filePath = path.join(staticPath, 'index.html');
      }

      electronAppReadFile(filePath, (error, content) => {
        if (error || !content) {
          response.writeHead(500);
          response.end('Server Error');
          return;
        }

        const ext = path.extname(filePath);
        response.writeHead(200, {
          'Content-Type': CONTENT_TYPES[ext] || 'application/octet-stream',
        });
        response.end(content);
      });
    });
  });

  return new Promise((resolve, reject) => {
    state.staticServer!.listen(state.staticPort, () => {
      logger.info('Static server running at http://localhost:' + state.staticPort);
      resolve();
    });
    state.staticServer!.on('error', reject);
  });
}

/**
 * Stop the static server if running
 */
export function stopStaticServer(): void {
  if (state.staticServer) {
    logger.info('Stopping static server...');
    state.staticServer.close();
    state.staticServer = null;
  }
}
