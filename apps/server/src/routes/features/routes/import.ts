/**
 * POST /import endpoint - Import features from JSON or YAML format
 */

import type { Request, Response } from 'express';
import type { FeatureLoader } from '../../../services/feature-loader.js';
import type { FeatureImportResult, Feature, FeatureExport } from '@automaker/types';
import { getFeatureExportService } from '../../../services/feature-export-service.js';
import { getErrorMessage, logError } from '../common.js';

interface ImportRequest {
  projectPath: string;
  /** Raw JSON or YAML string containing feature data */
  data: string;
  /** Whether to overwrite existing features with same ID */
  overwrite?: boolean;
  /** Whether to preserve branch info from imported features */
  preserveBranchInfo?: boolean;
  /** Optional category to assign to all imported features */
  targetCategory?: string;
}

interface ConflictCheckRequest {
  projectPath: string;
  /** Raw JSON or YAML string containing feature data */
  data: string;
}

interface ConflictInfo {
  featureId: string;
  title?: string;
  existingTitle?: string;
  hasConflict: boolean;
}

export function createImportHandler(featureLoader: FeatureLoader) {
  const exportService = getFeatureExportService();

  return async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        projectPath,
        data,
        overwrite = false,
        preserveBranchInfo = false,
        targetCategory,
      } = req.body as ImportRequest;

      if (!projectPath) {
        res.status(400).json({ success: false, error: 'projectPath is required' });
        return;
      }

      if (!data) {
        res.status(400).json({ success: false, error: 'data is required' });
        return;
      }

      // Detect format and parse the data
      const format = exportService.detectFormat(data);
      if (!format) {
        res.status(400).json({
          success: false,
          error: 'Invalid data format. Expected valid JSON or YAML.',
        });
        return;
      }

      const parsed = exportService.parseImportData(data);
      if (!parsed) {
        res.status(400).json({
          success: false,
          error: 'Failed to parse import data. Ensure it is valid JSON or YAML.',
        });
        return;
      }

      // Determine if this is a single feature or bulk import
      const isBulkImport =
        'features' in parsed && Array.isArray((parsed as { features: unknown }).features);

      let results: FeatureImportResult[];

      if (isBulkImport) {
        // Bulk import
        results = await exportService.importFeatures(projectPath, data, {
          overwrite,
          preserveBranchInfo,
          targetCategory,
        });
      } else {
        // Single feature import - we know it's not a bulk export at this point
        // It must be either a Feature or FeatureExport
        const singleData = parsed as Feature | FeatureExport;

        const result = await exportService.importFeature(projectPath, {
          data: singleData,
          overwrite,
          preserveBranchInfo,
          targetCategory,
        });
        results = [result];
      }

      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.filter((r) => !r.success).length;
      const allSuccessful = failureCount === 0;

      res.json({
        success: allSuccessful,
        importedCount: successCount,
        failedCount: failureCount,
        results,
      });
    } catch (error) {
      logError(error, 'Import features failed');
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}

/**
 * Create handler for checking conflicts before import
 */
export function createConflictCheckHandler(featureLoader: FeatureLoader) {
  const exportService = getFeatureExportService();

  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectPath, data } = req.body as ConflictCheckRequest;

      if (!projectPath) {
        res.status(400).json({ success: false, error: 'projectPath is required' });
        return;
      }

      if (!data) {
        res.status(400).json({ success: false, error: 'data is required' });
        return;
      }

      // Parse the import data
      const format = exportService.detectFormat(data);
      if (!format) {
        res.status(400).json({
          success: false,
          error: 'Invalid data format. Expected valid JSON or YAML.',
        });
        return;
      }

      const parsed = exportService.parseImportData(data);
      if (!parsed) {
        res.status(400).json({
          success: false,
          error: 'Failed to parse import data.',
        });
        return;
      }

      // Extract features from the data using type guards
      let featuresToCheck: Array<{ id: string; title?: string }> = [];

      if (exportService.isBulkExport(parsed)) {
        // Bulk export format
        featuresToCheck = parsed.features.map((f) => ({
          id: f.feature.id,
          title: f.feature.title,
        }));
      } else if (exportService.isFeatureExport(parsed)) {
        // Single FeatureExport format
        featuresToCheck = [
          {
            id: parsed.feature.id,
            title: parsed.feature.title,
          },
        ];
      } else if (exportService.isRawFeature(parsed)) {
        // Raw Feature format
        featuresToCheck = [{ id: parsed.id, title: parsed.title }];
      }

      // Check each feature for conflicts in parallel
      const conflicts: ConflictInfo[] = await Promise.all(
        featuresToCheck.map(async (feature) => {
          const existing = await featureLoader.get(projectPath, feature.id);
          return {
            featureId: feature.id,
            title: feature.title,
            existingTitle: existing?.title,
            hasConflict: !!existing,
          };
        })
      );

      const hasConflicts = conflicts.some((c) => c.hasConflict);

      res.json({
        success: true,
        hasConflicts,
        conflicts,
        totalFeatures: featuresToCheck.length,
        conflictCount: conflicts.filter((c) => c.hasConflict).length,
      });
    } catch (error) {
      logError(error, 'Conflict check failed');
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}
