/**
 * Path Utilities - Cross-platform path manipulation helpers
 *
 * Provides functions for normalizing and comparing file system paths
 * across different operating systems (Windows, macOS, Linux).
 */

/**
 * Normalize a path by converting backslashes to forward slashes
 *
 * This ensures consistent path representation across platforms:
 * - Windows: C:\Users\foo\bar -> C:/Users/foo/bar
 * - Unix: /home/foo/bar -> /home/foo/bar (unchanged)
 *
 * @param p - Path string to normalize
 * @returns Normalized path with forward slashes
 *
 * @example
 * ```typescript
 * normalizePath("C:\\Users\\foo\\bar"); // "C:/Users/foo/bar"
 * normalizePath("/home/foo/bar");       // "/home/foo/bar"
 * ```
 */
export function normalizePath(p: string): string {
  return p.replace(/\\/g, '/');
}

/**
 * Compare two paths for equality after normalization
 *
 * Handles null/undefined values and normalizes paths before comparison.
 * Useful for checking if two paths refer to the same location regardless
 * of platform-specific path separators.
 *
 * @param p1 - First path to compare (or null/undefined)
 * @param p2 - Second path to compare (or null/undefined)
 * @returns true if paths are equal (or both null/undefined), false otherwise
 *
 * @example
 * ```typescript
 * pathsEqual("C:\\foo\\bar", "C:/foo/bar");     // true
 * pathsEqual("/home/user", "/home/user");       // true
 * pathsEqual("/home/user", "/home/other");      // false
 * pathsEqual(null, undefined);                  // false
 * pathsEqual(null, null);                       // true
 * ```
 */
export function pathsEqual(p1: string | undefined | null, p2: string | undefined | null): boolean {
  if (!p1 || !p2) return p1 === p2;
  return normalizePath(p1) === normalizePath(p2);
}

/**
 * Sanitize a filename to be safe for cross-platform file system usage
 *
 * Removes or replaces characters that are invalid on various file systems
 * and prevents Windows reserved device names (CON, PRN, AUX, NUL, COM1-9, LPT1-9).
 *
 * @param filename - The filename to sanitize (without path, just the name)
 * @param fallback - Fallback name if sanitization results in empty string (default: 'file')
 * @returns A sanitized filename safe for all platforms
 *
 * @example
 * ```typescript
 * sanitizeFilename("my file.txt");        // "my_file.txt"
 * sanitizeFilename("nul.txt");             // "_nul.txt" (Windows reserved)
 * sanitizeFilename("con");                 // "_con" (Windows reserved)
 * sanitizeFilename("file?.txt");           // "file.txt"
 * sanitizeFilename("");                    // "file"
 * sanitizeFilename("", "unnamed");         // "unnamed"
 * ```
 */
export function sanitizeFilename(filename: string, fallback: string = 'file'): string {
  if (!filename || typeof filename !== 'string') {
    return fallback;
  }

  // Remove or replace invalid characters:
  // - Path separators: / \
  // - Windows invalid chars: : * ? " < > |
  // - Control characters and other problematic chars
  let safeName = filename
    .replace(/[/\\:*?"<>|]/g, '') // Remove invalid chars
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/\.+$/g, '') // Remove trailing dots (Windows issue)
    .replace(/^\.+/g, '') // Remove leading dots
    .trim();

  // If empty after sanitization, use fallback
  if (!safeName || safeName.length === 0) {
    return fallback;
  }

  // Handle Windows reserved device names (case-insensitive)
  // Reserved names: CON, PRN, AUX, NUL, COM1-9, LPT1-9
  const windowsReserved = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
  if (windowsReserved.test(safeName)) {
    safeName = `_${safeName}`;
  }

  return safeName;
}
