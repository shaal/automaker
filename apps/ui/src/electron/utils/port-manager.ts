/**
 * Port management utilities
 *
 * Functions for checking port availability and finding open ports.
 * No Electron dependencies - pure utility module.
 */

import net from 'net';

/**
 * Check if a port is available
 */
export function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => {
      resolve(false);
    });
    server.once('listening', () => {
      server.close(() => {
        resolve(true);
      });
    });
    // Use Node's default binding semantics (matches most dev servers)
    // This avoids false-positives when a port is taken on IPv6/dual-stack.
    server.listen(port);
  });
}

/**
 * Find an available port starting from the preferred port
 * Tries up to 100 ports in sequence
 */
export async function findAvailablePort(preferredPort: number): Promise<number> {
  for (let offset = 0; offset < 100; offset++) {
    const port = preferredPort + offset;
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`Could not find an available port starting from ${preferredPort}`);
}
