/**
 * Feature Export Service - Handles exporting and importing features in JSON/YAML formats
 *
 * Provides functionality to:
 * - Export single features to JSON or YAML format
 * - Export multiple features (bulk export)
 * - Import features from JSON or YAML data
 * - Validate import data for compatibility
 */

import { createLogger } from '@automaker/utils';
import { stringify as yamlStringify, parse as yamlParse } from 'yaml';
import type { Feature, FeatureExport, FeatureImport, FeatureImportResult } from '@automaker/types';
import { FeatureLoader } from './feature-loader.js';

const logger = createLogger('FeatureExportService');

/** Current export format version */
export const FEATURE_EXPORT_VERSION = '1.0.0';

/** Supported export formats */
export type ExportFormat = 'json' | 'yaml';

/** Options for exporting features */
export interface ExportOptions {
  /** Format to export in (default: 'json') */
  format?: ExportFormat;
  /** Whether to include description history (default: true) */
  includeHistory?: boolean;
  /** Whether to include plan spec (default: true) */
  includePlanSpec?: boolean;
  /** Optional metadata to include */
  metadata?: {
    projectName?: string;
    projectPath?: string;
    branch?: string;
    [key: string]: unknown;
  };
  /** Who/what is performing the export */
  exportedBy?: string;
  /** Pretty print output (default: true) */
  prettyPrint?: boolean;
}

/** Options for bulk export */
export interface BulkExportOptions extends ExportOptions {
  /** Filter by category */
  category?: string;
  /** Filter by status */
  status?: string;
  /** Feature IDs to include (if not specified, exports all) */
  featureIds?: string[];
}

/** Result of a bulk export */
export interface BulkExportResult {
  /** Export format version */
  version: string;
  /** ISO date string when the export was created */
  exportedAt: string;
  /** Number of features exported */
  count: number;
  /** The exported features */
  features: FeatureExport[];
  /** Export metadata */
  metadata?: {
    projectName?: string;
    projectPath?: string;
    branch?: string;
    [key: string]: unknown;
  };
}

/**
 * FeatureExportService - Manages feature export and import operations
 */
export class FeatureExportService {
  private featureLoader: FeatureLoader;

  constructor(featureLoader?: FeatureLoader) {
    this.featureLoader = featureLoader || new FeatureLoader();
  }

  /**
   * Export a single feature to the specified format
   *
   * @param projectPath - Path to the project
   * @param featureId - ID of the feature to export
   * @param options - Export options
   * @returns Promise resolving to the exported feature string
   */
  async exportFeature(
    projectPath: string,
    featureId: string,
    options: ExportOptions = {}
  ): Promise<string> {
    const feature = await this.featureLoader.get(projectPath, featureId);
    if (!feature) {
      throw new Error(`Feature ${featureId} not found`);
    }

    return this.exportFeatureData(feature, options);
  }

  /**
   * Export feature data to the specified format (without fetching from disk)
   *
   * @param feature - The feature to export
   * @param options - Export options
   * @returns The exported feature string
   */
  exportFeatureData(feature: Feature, options: ExportOptions = {}): string {
    const {
      format = 'json',
      includeHistory = true,
      includePlanSpec = true,
      metadata,
      exportedBy,
      prettyPrint = true,
    } = options;

    // Prepare feature data, optionally excluding some fields
    const featureData = this.prepareFeatureForExport(feature, {
      includeHistory,
      includePlanSpec,
    });

    const exportData: FeatureExport = {
      version: FEATURE_EXPORT_VERSION,
      feature: featureData,
      exportedAt: new Date().toISOString(),
      ...(exportedBy ? { exportedBy } : {}),
      ...(metadata ? { metadata } : {}),
    };

    return this.serialize(exportData, format, prettyPrint);
  }

  /**
   * Export multiple features to the specified format
   *
   * @param projectPath - Path to the project
   * @param options - Bulk export options
   * @returns Promise resolving to the exported features string
   */
  async exportFeatures(projectPath: string, options: BulkExportOptions = {}): Promise<string> {
    const {
      format = 'json',
      category,
      status,
      featureIds,
      includeHistory = true,
      includePlanSpec = true,
      metadata,
      prettyPrint = true,
    } = options;

    // Get all features
    let features = await this.featureLoader.getAll(projectPath);

    // Apply filters
    if (featureIds && featureIds.length > 0) {
      const idSet = new Set(featureIds);
      features = features.filter((f) => idSet.has(f.id));
    }
    if (category) {
      features = features.filter((f) => f.category === category);
    }
    if (status) {
      features = features.filter((f) => f.status === status);
    }

    // Generate timestamp once for consistent export time across all features
    const exportedAt = new Date().toISOString();

    // Prepare feature exports
    const featureExports: FeatureExport[] = features.map((feature) => ({
      version: FEATURE_EXPORT_VERSION,
      feature: this.prepareFeatureForExport(feature, { includeHistory, includePlanSpec }),
      exportedAt,
    }));

    const bulkExport: BulkExportResult = {
      version: FEATURE_EXPORT_VERSION,
      exportedAt,
      count: featureExports.length,
      features: featureExports,
      ...(metadata ? { metadata } : {}),
    };

    logger.info(`Exported ${featureExports.length} features from ${projectPath}`);

    return this.serialize(bulkExport, format, prettyPrint);
  }

  /**
   * Import a feature from JSON or YAML data
   *
   * @param projectPath - Path to the project
   * @param importData - Import configuration
   * @returns Promise resolving to the import result
   */
  async importFeature(
    projectPath: string,
    importData: FeatureImport
  ): Promise<FeatureImportResult> {
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      // Extract feature from data (handle both raw Feature and wrapped FeatureExport)
      const feature = this.extractFeatureFromImport(importData.data);
      if (!feature) {
        return {
          success: false,
          importedAt: new Date().toISOString(),
          errors: ['Invalid import data: could not extract feature'],
        };
      }

      // Validate required fields
      const validationErrors = this.validateFeature(feature);
      if (validationErrors.length > 0) {
        return {
          success: false,
          importedAt: new Date().toISOString(),
          errors: validationErrors,
        };
      }

      // Determine the feature ID to use
      const featureId = importData.newId || feature.id || this.featureLoader.generateFeatureId();

      // Check for existing feature
      const existingFeature = await this.featureLoader.get(projectPath, featureId);
      if (existingFeature && !importData.overwrite) {
        return {
          success: false,
          importedAt: new Date().toISOString(),
          errors: [`Feature with ID ${featureId} already exists. Set overwrite: true to replace.`],
        };
      }

      // Prepare feature for import
      const featureToImport: Feature = {
        ...feature,
        id: featureId,
        // Optionally override category
        ...(importData.targetCategory ? { category: importData.targetCategory } : {}),
        // Clear branch info if not preserving
        ...(importData.preserveBranchInfo ? {} : { branchName: undefined }),
      };

      // Clear runtime-specific fields that shouldn't be imported
      delete featureToImport.titleGenerating;
      delete featureToImport.error;

      // Handle image paths - they won't be valid after import
      if (featureToImport.imagePaths && featureToImport.imagePaths.length > 0) {
        warnings.push(
          `Feature had ${featureToImport.imagePaths.length} image path(s) that were cleared during import. Images must be re-attached.`
        );
        featureToImport.imagePaths = [];
      }

      // Handle text file paths - they won't be valid after import
      if (featureToImport.textFilePaths && featureToImport.textFilePaths.length > 0) {
        warnings.push(
          `Feature had ${featureToImport.textFilePaths.length} text file path(s) that were cleared during import. Files must be re-attached.`
        );
        featureToImport.textFilePaths = [];
      }

      // Create or update the feature
      if (existingFeature) {
        await this.featureLoader.update(projectPath, featureId, featureToImport);
        logger.info(`Updated feature ${featureId} via import`);
      } else {
        await this.featureLoader.create(projectPath, featureToImport);
        logger.info(`Created feature ${featureId} via import`);
      }

      return {
        success: true,
        featureId,
        importedAt: new Date().toISOString(),
        warnings: warnings.length > 0 ? warnings : undefined,
        wasOverwritten: !!existingFeature,
      };
    } catch (error) {
      logger.error('Failed to import feature:', error);
      return {
        success: false,
        importedAt: new Date().toISOString(),
        errors: [`Import failed: ${error instanceof Error ? error.message : String(error)}`],
      };
    }
  }

  /**
   * Import multiple features from JSON or YAML data
   *
   * @param projectPath - Path to the project
   * @param data - Raw JSON or YAML string, or parsed data
   * @param options - Import options applied to all features
   * @returns Promise resolving to array of import results
   */
  async importFeatures(
    projectPath: string,
    data: string | BulkExportResult,
    options: Omit<FeatureImport, 'data'> = {}
  ): Promise<FeatureImportResult[]> {
    let bulkData: BulkExportResult;

    // Parse if string
    if (typeof data === 'string') {
      const parsed = this.parseImportData(data);
      if (!parsed || !this.isBulkExport(parsed)) {
        return [
          {
            success: false,
            importedAt: new Date().toISOString(),
            errors: ['Invalid bulk import data: expected BulkExportResult format'],
          },
        ];
      }
      bulkData = parsed as BulkExportResult;
    } else {
      bulkData = data;
    }

    // Import each feature
    const results: FeatureImportResult[] = [];
    for (const featureExport of bulkData.features) {
      const result = await this.importFeature(projectPath, {
        data: featureExport,
        ...options,
      });
      results.push(result);
    }

    const successCount = results.filter((r) => r.success).length;
    logger.info(`Bulk import complete: ${successCount}/${results.length} features imported`);

    return results;
  }

  /**
   * Parse import data from JSON or YAML string
   *
   * @param data - Raw JSON or YAML string
   * @returns Parsed data or null if parsing fails
   */
  parseImportData(data: string): Feature | FeatureExport | BulkExportResult | null {
    const trimmed = data.trim();

    // Try JSON first
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        return JSON.parse(trimmed);
      } catch {
        // Fall through to YAML
      }
    }

    // Try YAML
    try {
      return yamlParse(trimmed);
    } catch (error) {
      logger.error('Failed to parse import data:', error);
      return null;
    }
  }

  /**
   * Detect the format of import data
   *
   * @param data - Raw string data
   * @returns Detected format or null if unknown
   */
  detectFormat(data: string): ExportFormat | null {
    const trimmed = data.trim();

    // JSON detection
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        JSON.parse(trimmed);
        return 'json';
      } catch {
        // Not valid JSON
      }
    }

    // YAML detection (if it parses and wasn't JSON)
    try {
      yamlParse(trimmed);
      return 'yaml';
    } catch {
      // Not valid YAML either
    }

    return null;
  }

  /**
   * Prepare a feature for export by optionally removing fields
   */
  private prepareFeatureForExport(
    feature: Feature,
    options: { includeHistory?: boolean; includePlanSpec?: boolean }
  ): Feature {
    const { includeHistory = true, includePlanSpec = true } = options;

    // Clone to avoid modifying original
    const exported: Feature = { ...feature };

    // Remove transient fields that shouldn't be exported
    delete exported.titleGenerating;
    delete exported.error;

    // Optionally exclude history
    if (!includeHistory) {
      delete exported.descriptionHistory;
    }

    // Optionally exclude plan spec
    if (!includePlanSpec) {
      delete exported.planSpec;
    }

    return exported;
  }

  /**
   * Extract a Feature from import data (handles both raw and wrapped formats)
   */
  private extractFeatureFromImport(data: Feature | FeatureExport): Feature | null {
    if (!data || typeof data !== 'object') {
      return null;
    }

    // Check if it's a FeatureExport wrapper
    if ('version' in data && 'feature' in data && 'exportedAt' in data) {
      const exportData = data as FeatureExport;
      return exportData.feature;
    }

    // Assume it's a raw Feature
    return data as Feature;
  }

  /**
   * Check if parsed data is a bulk export
   */
  isBulkExport(data: unknown): data is BulkExportResult {
    if (!data || typeof data !== 'object') {
      return false;
    }
    const obj = data as Record<string, unknown>;
    return 'version' in obj && 'features' in obj && Array.isArray(obj.features);
  }

  /**
   * Check if parsed data is a single FeatureExport
   */
  isFeatureExport(data: unknown): data is FeatureExport {
    if (!data || typeof data !== 'object') {
      return false;
    }
    const obj = data as Record<string, unknown>;
    return (
      'version' in obj &&
      'feature' in obj &&
      'exportedAt' in obj &&
      typeof obj.feature === 'object' &&
      obj.feature !== null &&
      'id' in (obj.feature as Record<string, unknown>)
    );
  }

  /**
   * Check if parsed data is a raw Feature
   */
  isRawFeature(data: unknown): data is Feature {
    if (!data || typeof data !== 'object') {
      return false;
    }
    const obj = data as Record<string, unknown>;
    // A raw feature has 'id' but not the 'version' + 'feature' wrapper of FeatureExport
    return 'id' in obj && !('feature' in obj && 'version' in obj);
  }

  /**
   * Validate a feature has required fields
   */
  private validateFeature(feature: Feature): string[] {
    const errors: string[] = [];

    if (!feature.description && !feature.title) {
      errors.push('Feature must have at least a title or description');
    }

    if (!feature.category) {
      errors.push('Feature must have a category');
    }

    return errors;
  }

  /**
   * Serialize export data to string (handles both single feature and bulk exports)
   */
  private serialize<T extends FeatureExport | BulkExportResult>(
    data: T,
    format: ExportFormat,
    prettyPrint: boolean
  ): string {
    if (format === 'yaml') {
      return yamlStringify(data, {
        indent: 2,
        lineWidth: 120,
      });
    }

    return prettyPrint ? JSON.stringify(data, null, 2) : JSON.stringify(data);
  }
}

// Singleton instance
let featureExportServiceInstance: FeatureExportService | null = null;

/**
 * Get the singleton feature export service instance
 */
export function getFeatureExportService(): FeatureExportService {
  if (!featureExportServiceInstance) {
    featureExportServiceInstance = new FeatureExportService();
  }
  return featureExportServiceInstance;
}
