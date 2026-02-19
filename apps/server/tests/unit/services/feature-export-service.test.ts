import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FeatureExportService, FEATURE_EXPORT_VERSION } from '@/services/feature-export-service.js';
import type { Feature, FeatureExport } from '@automaker/types';
import type { FeatureLoader } from '@/services/feature-loader.js';

describe('feature-export-service.ts', () => {
  let exportService: FeatureExportService;
  let mockFeatureLoader: {
    get: ReturnType<typeof vi.fn>;
    getAll: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    generateFeatureId: ReturnType<typeof vi.fn>;
  };
  const testProjectPath = '/test/project';

  const sampleFeature: Feature = {
    id: 'feature-123-abc',
    title: 'Test Feature',
    category: 'UI',
    description: 'A test feature description',
    status: 'pending',
    priority: 1,
    dependencies: ['feature-456'],
    descriptionHistory: [
      {
        description: 'Initial description',
        timestamp: '2024-01-01T00:00:00.000Z',
        source: 'initial',
      },
    ],
    planSpec: {
      status: 'generated',
      content: 'Plan content',
      version: 1,
      reviewedByUser: false,
    },
    imagePaths: ['/tmp/image1.png', '/tmp/image2.jpg'],
    textFilePaths: [
      {
        id: 'file-1',
        path: '/tmp/doc.txt',
        filename: 'doc.txt',
        mimeType: 'text/plain',
        content: 'Some content',
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock FeatureLoader instance
    mockFeatureLoader = {
      get: vi.fn(),
      getAll: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      generateFeatureId: vi.fn().mockReturnValue('feature-mock-id'),
    };

    // Inject mock via constructor
    exportService = new FeatureExportService(mockFeatureLoader as unknown as FeatureLoader);
  });

  describe('exportFeatureData', () => {
    it('should export feature to JSON format', () => {
      const result = exportService.exportFeatureData(sampleFeature, { format: 'json' });

      const parsed = JSON.parse(result) as FeatureExport;
      expect(parsed.version).toBe(FEATURE_EXPORT_VERSION);
      expect(parsed.feature.id).toBe(sampleFeature.id);
      expect(parsed.feature.title).toBe(sampleFeature.title);
      expect(parsed.exportedAt).toBeDefined();
    });

    it('should export feature to YAML format', () => {
      const result = exportService.exportFeatureData(sampleFeature, { format: 'yaml' });

      expect(result).toContain('version:');
      expect(result).toContain('feature:');
      expect(result).toContain('Test Feature');
      expect(result).toContain('exportedAt:');
    });

    it('should exclude description history when option is false', () => {
      const result = exportService.exportFeatureData(sampleFeature, {
        format: 'json',
        includeHistory: false,
      });

      const parsed = JSON.parse(result) as FeatureExport;
      expect(parsed.feature.descriptionHistory).toBeUndefined();
    });

    it('should include description history by default', () => {
      const result = exportService.exportFeatureData(sampleFeature, { format: 'json' });

      const parsed = JSON.parse(result) as FeatureExport;
      expect(parsed.feature.descriptionHistory).toBeDefined();
      expect(parsed.feature.descriptionHistory).toHaveLength(1);
    });

    it('should exclude plan spec when option is false', () => {
      const result = exportService.exportFeatureData(sampleFeature, {
        format: 'json',
        includePlanSpec: false,
      });

      const parsed = JSON.parse(result) as FeatureExport;
      expect(parsed.feature.planSpec).toBeUndefined();
    });

    it('should include plan spec by default', () => {
      const result = exportService.exportFeatureData(sampleFeature, { format: 'json' });

      const parsed = JSON.parse(result) as FeatureExport;
      expect(parsed.feature.planSpec).toBeDefined();
    });

    it('should include metadata when provided', () => {
      const result = exportService.exportFeatureData(sampleFeature, {
        format: 'json',
        metadata: { projectName: 'TestProject', branch: 'main' },
      });

      const parsed = JSON.parse(result) as FeatureExport;
      expect(parsed.metadata).toEqual({ projectName: 'TestProject', branch: 'main' });
    });

    it('should include exportedBy when provided', () => {
      const result = exportService.exportFeatureData(sampleFeature, {
        format: 'json',
        exportedBy: 'test-user',
      });

      const parsed = JSON.parse(result) as FeatureExport;
      expect(parsed.exportedBy).toBe('test-user');
    });

    it('should remove transient fields (titleGenerating, error)', () => {
      const featureWithTransient: Feature = {
        ...sampleFeature,
        titleGenerating: true,
        error: 'Some error',
      };

      const result = exportService.exportFeatureData(featureWithTransient, { format: 'json' });

      const parsed = JSON.parse(result) as FeatureExport;
      expect(parsed.feature.titleGenerating).toBeUndefined();
      expect(parsed.feature.error).toBeUndefined();
    });

    it('should support compact JSON (prettyPrint: false)', () => {
      const prettyResult = exportService.exportFeatureData(sampleFeature, {
        format: 'json',
        prettyPrint: true,
      });
      const compactResult = exportService.exportFeatureData(sampleFeature, {
        format: 'json',
        prettyPrint: false,
      });

      // Compact should have no newlines/indentation
      expect(compactResult).not.toContain('\n');
      // Pretty should have newlines
      expect(prettyResult).toContain('\n');
    });
  });

  describe('exportFeature', () => {
    it('should fetch and export feature by ID', async () => {
      mockFeatureLoader.get.mockResolvedValue(sampleFeature);

      const result = await exportService.exportFeature(testProjectPath, 'feature-123-abc');

      expect(mockFeatureLoader.get).toHaveBeenCalledWith(testProjectPath, 'feature-123-abc');
      const parsed = JSON.parse(result) as FeatureExport;
      expect(parsed.feature.id).toBe(sampleFeature.id);
    });

    it('should throw when feature not found', async () => {
      mockFeatureLoader.get.mockResolvedValue(null);

      await expect(exportService.exportFeature(testProjectPath, 'nonexistent')).rejects.toThrow(
        'Feature nonexistent not found'
      );
    });
  });

  describe('exportFeatures', () => {
    const features: Feature[] = [
      { ...sampleFeature, id: 'feature-1', category: 'UI' },
      { ...sampleFeature, id: 'feature-2', category: 'Backend', status: 'completed' },
      { ...sampleFeature, id: 'feature-3', category: 'UI', status: 'pending' },
    ];

    it('should export all features', async () => {
      mockFeatureLoader.getAll.mockResolvedValue(features);

      const result = await exportService.exportFeatures(testProjectPath);

      const parsed = JSON.parse(result);
      expect(parsed.count).toBe(3);
      expect(parsed.features).toHaveLength(3);
    });

    it('should filter by category', async () => {
      mockFeatureLoader.getAll.mockResolvedValue(features);

      const result = await exportService.exportFeatures(testProjectPath, { category: 'UI' });

      const parsed = JSON.parse(result);
      expect(parsed.count).toBe(2);
      expect(parsed.features.every((f: FeatureExport) => f.feature.category === 'UI')).toBe(true);
    });

    it('should filter by status', async () => {
      mockFeatureLoader.getAll.mockResolvedValue(features);

      const result = await exportService.exportFeatures(testProjectPath, { status: 'completed' });

      const parsed = JSON.parse(result);
      expect(parsed.count).toBe(1);
      expect(parsed.features[0].feature.status).toBe('completed');
    });

    it('should filter by feature IDs', async () => {
      mockFeatureLoader.getAll.mockResolvedValue(features);

      const result = await exportService.exportFeatures(testProjectPath, {
        featureIds: ['feature-1', 'feature-3'],
      });

      const parsed = JSON.parse(result);
      expect(parsed.count).toBe(2);
      const ids = parsed.features.map((f: FeatureExport) => f.feature.id);
      expect(ids).toContain('feature-1');
      expect(ids).toContain('feature-3');
      expect(ids).not.toContain('feature-2');
    });

    it('should export to YAML format', async () => {
      mockFeatureLoader.getAll.mockResolvedValue(features);

      const result = await exportService.exportFeatures(testProjectPath, { format: 'yaml' });

      expect(result).toContain('version:');
      expect(result).toContain('count:');
      expect(result).toContain('features:');
    });

    it('should include metadata when provided', async () => {
      mockFeatureLoader.getAll.mockResolvedValue(features);

      const result = await exportService.exportFeatures(testProjectPath, {
        metadata: { projectName: 'TestProject' },
      });

      const parsed = JSON.parse(result);
      expect(parsed.metadata).toEqual({ projectName: 'TestProject' });
    });
  });

  describe('parseImportData', () => {
    it('should parse valid JSON', () => {
      const json = JSON.stringify(sampleFeature);
      const result = exportService.parseImportData(json);

      expect(result).toBeDefined();
      expect((result as Feature).id).toBe(sampleFeature.id);
    });

    it('should parse valid YAML', () => {
      const yaml = `
id: feature-yaml-123
title: YAML Feature
category: Testing
description: A YAML feature
`;
      const result = exportService.parseImportData(yaml);

      expect(result).toBeDefined();
      expect((result as Feature).id).toBe('feature-yaml-123');
      expect((result as Feature).title).toBe('YAML Feature');
    });

    it('should return null for invalid data', () => {
      const result = exportService.parseImportData('not valid {json} or yaml: [');

      expect(result).toBeNull();
    });

    it('should parse FeatureExport wrapper', () => {
      const exportData: FeatureExport = {
        version: '1.0.0',
        feature: sampleFeature,
        exportedAt: new Date().toISOString(),
      };
      const json = JSON.stringify(exportData);

      const result = exportService.parseImportData(json) as FeatureExport;

      expect(result.version).toBe('1.0.0');
      expect(result.feature.id).toBe(sampleFeature.id);
    });
  });

  describe('detectFormat', () => {
    it('should detect JSON format', () => {
      const json = JSON.stringify({ id: 'test' });
      expect(exportService.detectFormat(json)).toBe('json');
    });

    it('should detect YAML format', () => {
      const yaml = `
id: test
title: Test
`;
      expect(exportService.detectFormat(yaml)).toBe('yaml');
    });

    it('should detect YAML for plain text (YAML is very permissive)', () => {
      // YAML parses any plain text as a string, so this is detected as valid YAML
      // The actual validation happens in parseImportData which checks for required fields
      expect(exportService.detectFormat('not valid {[')).toBe('yaml');
    });

    it('should handle whitespace', () => {
      const json = '  { "id": "test" }  ';
      expect(exportService.detectFormat(json)).toBe('json');
    });
  });

  describe('importFeature', () => {
    it('should import feature from raw Feature data', async () => {
      mockFeatureLoader.get.mockResolvedValue(null);
      mockFeatureLoader.create.mockResolvedValue(sampleFeature);

      const result = await exportService.importFeature(testProjectPath, {
        data: sampleFeature,
      });

      expect(result.success).toBe(true);
      expect(result.featureId).toBe(sampleFeature.id);
      expect(mockFeatureLoader.create).toHaveBeenCalled();
    });

    it('should import feature from FeatureExport wrapper', async () => {
      mockFeatureLoader.get.mockResolvedValue(null);
      mockFeatureLoader.create.mockResolvedValue(sampleFeature);

      const exportData: FeatureExport = {
        version: '1.0.0',
        feature: sampleFeature,
        exportedAt: new Date().toISOString(),
      };

      const result = await exportService.importFeature(testProjectPath, {
        data: exportData,
      });

      expect(result.success).toBe(true);
      expect(result.featureId).toBe(sampleFeature.id);
    });

    it('should use custom ID when provided', async () => {
      mockFeatureLoader.get.mockResolvedValue(null);
      mockFeatureLoader.create.mockImplementation(async (_, data) => ({
        ...sampleFeature,
        id: data.id!,
      }));

      const result = await exportService.importFeature(testProjectPath, {
        data: sampleFeature,
        newId: 'custom-id-123',
      });

      expect(result.success).toBe(true);
      expect(result.featureId).toBe('custom-id-123');
    });

    it('should fail when feature exists and overwrite is false', async () => {
      mockFeatureLoader.get.mockResolvedValue(sampleFeature);

      const result = await exportService.importFeature(testProjectPath, {
        data: sampleFeature,
        overwrite: false,
      });

      expect(result.success).toBe(false);
      expect(result.errors).toContain(
        `Feature with ID ${sampleFeature.id} already exists. Set overwrite: true to replace.`
      );
    });

    it('should overwrite when overwrite is true', async () => {
      mockFeatureLoader.get.mockResolvedValue(sampleFeature);
      mockFeatureLoader.update.mockResolvedValue(sampleFeature);

      const result = await exportService.importFeature(testProjectPath, {
        data: sampleFeature,
        overwrite: true,
      });

      expect(result.success).toBe(true);
      expect(result.wasOverwritten).toBe(true);
      expect(mockFeatureLoader.update).toHaveBeenCalled();
    });

    it('should apply target category override', async () => {
      mockFeatureLoader.get.mockResolvedValue(null);
      mockFeatureLoader.create.mockImplementation(async (_, data) => ({
        ...sampleFeature,
        ...data,
      }));

      await exportService.importFeature(testProjectPath, {
        data: sampleFeature,
        targetCategory: 'NewCategory',
      });

      const createCall = mockFeatureLoader.create.mock.calls[0];
      expect(createCall[1].category).toBe('NewCategory');
    });

    it('should clear branch info when preserveBranchInfo is false', async () => {
      const featureWithBranch: Feature = {
        ...sampleFeature,
        branchName: 'feature/test-branch',
      };
      mockFeatureLoader.get.mockResolvedValue(null);
      mockFeatureLoader.create.mockImplementation(async (_, data) => ({
        ...featureWithBranch,
        ...data,
      }));

      await exportService.importFeature(testProjectPath, {
        data: featureWithBranch,
        preserveBranchInfo: false,
      });

      const createCall = mockFeatureLoader.create.mock.calls[0];
      expect(createCall[1].branchName).toBeUndefined();
    });

    it('should preserve branch info when preserveBranchInfo is true', async () => {
      const featureWithBranch: Feature = {
        ...sampleFeature,
        branchName: 'feature/test-branch',
      };
      mockFeatureLoader.get.mockResolvedValue(null);
      mockFeatureLoader.create.mockImplementation(async (_, data) => ({
        ...featureWithBranch,
        ...data,
      }));

      await exportService.importFeature(testProjectPath, {
        data: featureWithBranch,
        preserveBranchInfo: true,
      });

      const createCall = mockFeatureLoader.create.mock.calls[0];
      expect(createCall[1].branchName).toBe('feature/test-branch');
    });

    it('should warn and clear image paths', async () => {
      mockFeatureLoader.get.mockResolvedValue(null);
      mockFeatureLoader.create.mockResolvedValue(sampleFeature);

      const result = await exportService.importFeature(testProjectPath, {
        data: sampleFeature,
      });

      expect(result.warnings).toBeDefined();
      expect(result.warnings).toContainEqual(expect.stringContaining('image path'));
      const createCall = mockFeatureLoader.create.mock.calls[0];
      expect(createCall[1].imagePaths).toEqual([]);
    });

    it('should warn and clear text file paths', async () => {
      mockFeatureLoader.get.mockResolvedValue(null);
      mockFeatureLoader.create.mockResolvedValue(sampleFeature);

      const result = await exportService.importFeature(testProjectPath, {
        data: sampleFeature,
      });

      expect(result.warnings).toBeDefined();
      expect(result.warnings).toContainEqual(expect.stringContaining('text file path'));
      const createCall = mockFeatureLoader.create.mock.calls[0];
      expect(createCall[1].textFilePaths).toEqual([]);
    });

    it('should fail with validation error for missing required fields', async () => {
      const invalidFeature = {
        id: 'feature-invalid',
        // Missing description, title, and category
      } as Feature;

      const result = await exportService.importFeature(testProjectPath, {
        data: invalidFeature,
      });

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.some((e) => e.includes('title or description'))).toBe(true);
    });

    it('should generate ID when none provided', async () => {
      const featureWithoutId = {
        title: 'No ID Feature',
        category: 'Testing',
        description: 'Feature without ID',
      } as Feature;

      mockFeatureLoader.get.mockResolvedValue(null);
      mockFeatureLoader.create.mockImplementation(async (_, data) => ({
        ...featureWithoutId,
        id: data.id!,
      }));

      const result = await exportService.importFeature(testProjectPath, {
        data: featureWithoutId,
      });

      expect(result.success).toBe(true);
      expect(result.featureId).toBe('feature-mock-id');
    });
  });

  describe('importFeatures', () => {
    const bulkExport = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      count: 2,
      features: [
        {
          version: '1.0.0',
          feature: { ...sampleFeature, id: 'feature-1' },
          exportedAt: new Date().toISOString(),
        },
        {
          version: '1.0.0',
          feature: { ...sampleFeature, id: 'feature-2' },
          exportedAt: new Date().toISOString(),
        },
      ],
    };

    it('should import multiple features from JSON string', async () => {
      mockFeatureLoader.get.mockResolvedValue(null);
      mockFeatureLoader.create.mockImplementation(async (_, data) => ({
        ...sampleFeature,
        id: data.id!,
      }));

      const results = await exportService.importFeatures(
        testProjectPath,
        JSON.stringify(bulkExport)
      );

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });

    it('should import multiple features from parsed data', async () => {
      mockFeatureLoader.get.mockResolvedValue(null);
      mockFeatureLoader.create.mockImplementation(async (_, data) => ({
        ...sampleFeature,
        id: data.id!,
      }));

      const results = await exportService.importFeatures(testProjectPath, bulkExport);

      expect(results).toHaveLength(2);
      expect(results.every((r) => r.success)).toBe(true);
    });

    it('should apply options to all features', async () => {
      mockFeatureLoader.get.mockResolvedValue(null);
      mockFeatureLoader.create.mockImplementation(async (_, data) => ({
        ...sampleFeature,
        ...data,
      }));

      await exportService.importFeatures(testProjectPath, bulkExport, {
        targetCategory: 'ImportedCategory',
      });

      const createCalls = mockFeatureLoader.create.mock.calls;
      expect(createCalls[0][1].category).toBe('ImportedCategory');
      expect(createCalls[1][1].category).toBe('ImportedCategory');
    });

    it('should return error for invalid bulk format', async () => {
      const results = await exportService.importFeatures(testProjectPath, '{ "invalid": "data" }');

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].errors).toContainEqual(expect.stringContaining('Invalid bulk import data'));
    });

    it('should handle partial failures', async () => {
      mockFeatureLoader.get.mockResolvedValueOnce(null).mockResolvedValueOnce(sampleFeature); // Second feature exists

      mockFeatureLoader.create.mockImplementation(async (_, data) => ({
        ...sampleFeature,
        id: data.id!,
      }));

      const results = await exportService.importFeatures(testProjectPath, bulkExport, {
        overwrite: false,
      });

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false); // Exists without overwrite
    });
  });
});
