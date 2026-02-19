/**
 * POST /export endpoint - Export features to JSON or YAML format
 */

import type { Request, Response } from 'express';
import type { FeatureLoader } from '../../../services/feature-loader.js';
import {
  getFeatureExportService,
  type ExportFormat,
  type BulkExportOptions,
} from '../../../services/feature-export-service.js';
import { getErrorMessage, logError } from '../common.js';

interface ExportRequest {
  projectPath: string;
  /** Feature IDs to export. If empty/undefined, exports all features */
  featureIds?: string[];
  /** Export format: 'json' or 'yaml' */
  format?: ExportFormat;
  /** Whether to include description history */
  includeHistory?: boolean;
  /** Whether to include plan spec */
  includePlanSpec?: boolean;
  /** Filter by category */
  category?: string;
  /** Filter by status */
  status?: string;
  /** Pretty print output */
  prettyPrint?: boolean;
  /** Optional metadata to include */
  metadata?: {
    projectName?: string;
    projectPath?: string;
    branch?: string;
    [key: string]: unknown;
  };
}

export function createExportHandler(featureLoader: FeatureLoader) {
  const exportService = getFeatureExportService();

  return async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        projectPath,
        featureIds,
        format = 'json',
        includeHistory = true,
        includePlanSpec = true,
        category,
        status,
        prettyPrint = true,
        metadata,
      } = req.body as ExportRequest;

      if (!projectPath) {
        res.status(400).json({ success: false, error: 'projectPath is required' });
        return;
      }

      // Validate format
      if (format !== 'json' && format !== 'yaml') {
        res.status(400).json({
          success: false,
          error: 'format must be "json" or "yaml"',
        });
        return;
      }

      const options: BulkExportOptions = {
        format,
        includeHistory,
        includePlanSpec,
        category,
        status,
        featureIds,
        prettyPrint,
        metadata,
      };

      const exportData = await exportService.exportFeatures(projectPath, options);

      // Return the export data as a string in the response
      res.json({
        success: true,
        data: exportData,
        format,
        contentType: format === 'json' ? 'application/json' : 'application/x-yaml',
        filename: `features-export.${format === 'json' ? 'json' : 'yaml'}`,
      });
    } catch (error) {
      logError(error, 'Export features failed');
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}
