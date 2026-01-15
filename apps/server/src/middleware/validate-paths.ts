/**
 * Middleware for validating path parameters against ALLOWED_ROOT_DIRECTORY
 * Provides a clean, reusable way to validate paths without repeating the same
 * try-catch block in every route handler
 */

import type { Request, Response, NextFunction } from 'express';
import { validatePath, PathNotAllowedError } from '@automaker/platform';

/**
 * Helper to get parameter value from request (checks body first, then query)
 */
function getParamValue(req: Request, paramName: string): unknown {
  // Check body first (for POST/PUT/PATCH requests)
  if (req.body && req.body[paramName] !== undefined) {
    return req.body[paramName];
  }
  // Fall back to query params (for GET requests)
  if (req.query && req.query[paramName] !== undefined) {
    return req.query[paramName];
  }
  return undefined;
}

/**
 * Creates a middleware that validates specified path parameters in req.body or req.query
 * @param paramNames - Names of parameters to validate (e.g., 'projectPath', 'worktreePath')
 * @example
 * router.post('/create', validatePathParams('projectPath'), handler);
 * router.post('/delete', validatePathParams('projectPath', 'worktreePath'), handler);
 * router.post('/send', validatePathParams('workingDirectory?', 'imagePaths[]'), handler);
 * router.get('/logs', validatePathParams('worktreePath'), handler); // Works with query params too
 *
 * Special syntax:
 * - 'paramName?' - Optional parameter (only validated if present)
 * - 'paramName[]' - Array parameter (validates each element)
 */
export function validatePathParams(...paramNames: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      for (const paramName of paramNames) {
        // Handle optional parameters (paramName?)
        if (paramName.endsWith('?')) {
          const actualName = paramName.slice(0, -1);
          const value = getParamValue(req, actualName);
          if (value && typeof value === 'string') {
            validatePath(value);
          }
          continue;
        }

        // Handle array parameters (paramName[])
        if (paramName.endsWith('[]')) {
          const actualName = paramName.slice(0, -2);
          const values = getParamValue(req, actualName);
          if (Array.isArray(values) && values.length > 0) {
            for (const value of values) {
              if (typeof value === 'string') {
                validatePath(value);
              }
            }
          }
          continue;
        }

        // Handle regular parameters
        const value = getParamValue(req, paramName);
        if (value && typeof value === 'string') {
          validatePath(value);
        }
      }

      next();
    } catch (error) {
      if (error instanceof PathNotAllowedError) {
        res.status(403).json({
          success: false,
          error: error.message,
        });
        return;
      }

      // Re-throw unexpected errors
      throw error;
    }
  };
}
