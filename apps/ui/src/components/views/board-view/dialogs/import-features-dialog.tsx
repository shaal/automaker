import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { CategoryAutocomplete } from '@/components/ui/category-autocomplete';
import { Upload, AlertTriangle, CheckCircle2, XCircle, FileJson, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { getHttpApiClient } from '@/lib/http-api-client';
import { cn } from '@/lib/utils';

interface ConflictInfo {
  featureId: string;
  title?: string;
  existingTitle?: string;
  hasConflict: boolean;
}

interface ImportResult {
  success: boolean;
  featureId?: string;
  importedAt: string;
  warnings?: string[];
  errors?: string[];
  wasOverwritten?: boolean;
}

interface ImportFeaturesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectPath: string;
  categorySuggestions: string[];
  onImportComplete?: () => void;
}

type ImportStep = 'upload' | 'review' | 'result';

export function ImportFeaturesDialog({
  open,
  onOpenChange,
  projectPath,
  categorySuggestions,
  onImportComplete,
}: ImportFeaturesDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<ImportStep>('upload');
  const [fileData, setFileData] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [fileFormat, setFileFormat] = useState<'json' | 'yaml' | null>(null);

  // Options
  const [overwrite, setOverwrite] = useState(false);
  const [targetCategory, setTargetCategory] = useState('');

  // Conflict check results
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);

  // Import results
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  // Parse error
  const [parseError, setParseError] = useState<string>('');

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setStep('upload');
      setFileData('');
      setFileName('');
      setFileFormat(null);
      setOverwrite(false);
      setTargetCategory('');
      setConflicts([]);
      setImportResults([]);
      setParseError('');
    }
  }, [open]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file extension
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'json' && ext !== 'yaml' && ext !== 'yml') {
      setParseError('Please select a JSON or YAML file');
      return;
    }

    try {
      const content = await file.text();
      setFileData(content);
      setFileName(file.name);
      setFileFormat(ext === 'yml' ? 'yaml' : (ext as 'json' | 'yaml'));
      setParseError('');

      // Check for conflicts
      await checkConflicts(content);
    } catch {
      setParseError('Failed to read file');
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const checkConflicts = async (data: string) => {
    setIsCheckingConflicts(true);
    try {
      const api = getHttpApiClient();
      const result = await api.features.checkConflicts(projectPath, data);

      if (!result.success) {
        setParseError(result.error || 'Failed to parse import file');
        setConflicts([]);
        return;
      }

      setConflicts(result.conflicts || []);
      setStep('review');
    } catch (error) {
      setParseError(error instanceof Error ? error.message : 'Failed to check conflicts');
    } finally {
      setIsCheckingConflicts(false);
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    try {
      const api = getHttpApiClient();
      const result = await api.features.import(projectPath, fileData, {
        overwrite,
        targetCategory: targetCategory || undefined,
      });

      if (!result.success && result.failedCount === result.results?.length) {
        toast.error(result.error || 'Failed to import features');
        return;
      }

      setImportResults(result.results || []);
      setStep('result');

      const successCount = result.importedCount || 0;
      const failCount = result.failedCount || 0;

      if (failCount === 0) {
        toast.success(`Successfully imported ${successCount} feature(s)`);
      } else if (successCount > 0) {
        toast.warning(`Imported ${successCount} feature(s), ${failCount} failed`);
      } else {
        toast.error(`Failed to import features`);
      }

      onImportComplete?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to import features');
    } finally {
      setIsImporting(false);
    }
  };

  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const file = event.dataTransfer.files[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'json' && ext !== 'yaml' && ext !== 'yml') {
      setParseError('Please drop a JSON or YAML file');
      return;
    }

    try {
      const content = await file.text();
      setFileData(content);
      setFileName(file.name);
      setFileFormat(ext === 'yml' ? 'yaml' : (ext as 'json' | 'yaml'));
      setParseError('');

      await checkConflicts(content);
    } catch {
      setParseError('Failed to read file');
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const conflictingFeatures = conflicts.filter((c) => c.hasConflict);
  const hasConflicts = conflictingFeatures.length > 0;

  const renderUploadStep = () => (
    <div className="py-4 space-y-4">
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
          'hover:border-primary/50 hover:bg-muted/30',
          parseError ? 'border-destructive/50' : 'border-border'
        )}
        onClick={() => fileInputRef.current?.click()}
        data-testid="import-drop-zone"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.yaml,.yml"
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="flex flex-col items-center gap-3">
          <Upload className="w-8 h-8 text-muted-foreground" />
          <div className="text-sm">
            <span className="text-primary font-medium">Click to upload</span>
            <span className="text-muted-foreground"> or drag and drop</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileJson className="w-3.5 h-3.5" />
            <span>JSON</span>
            <span>or</span>
            <FileText className="w-3.5 h-3.5" />
            <span>YAML</span>
          </div>
        </div>
      </div>

      {parseError && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <XCircle className="w-4 h-4" />
          {parseError}
        </div>
      )}

      {isCheckingConflicts && (
        <div className="text-sm text-muted-foreground text-center">Analyzing file...</div>
      )}
    </div>
  );

  const renderReviewStep = () => (
    <div className="py-4 space-y-4">
      {/* File Info */}
      <div className="flex items-center gap-2 p-3 rounded-md border border-border/50 bg-muted/30">
        {fileFormat === 'json' ? (
          <FileJson className="w-5 h-5 text-muted-foreground" />
        ) : (
          <FileText className="w-5 h-5 text-muted-foreground" />
        )}
        <div className="flex-1 truncate">
          <div className="text-sm font-medium">{fileName}</div>
          <div className="text-xs text-muted-foreground">
            {conflicts.length} feature(s) to import
          </div>
        </div>
      </div>

      {/* Conflict Warning */}
      {hasConflicts && (
        <div className="flex items-start gap-2 p-3 rounded-md border border-warning/50 bg-warning/10">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="text-sm font-medium text-warning">
              {conflictingFeatures.length} conflict(s) detected
            </div>
            <div className="text-xs text-muted-foreground">
              The following features already exist in this project:
            </div>
            <ul className="text-xs text-muted-foreground list-disc list-inside max-h-24 overflow-y-auto">
              {conflictingFeatures.map((c) => (
                <li key={c.featureId} className="truncate">
                  {c.existingTitle || c.featureId}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Options */}
      <div className="space-y-3">
        <Label>Import Options</Label>

        {hasConflicts && (
          <div className="flex items-center gap-2">
            <Checkbox
              id="overwrite"
              checked={overwrite}
              onCheckedChange={(checked) => setOverwrite(!!checked)}
              data-testid="import-overwrite"
            />
            <Label htmlFor="overwrite" className="text-sm font-normal cursor-pointer">
              Overwrite existing features with same ID
            </Label>
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            Target Category (optional - override imported categories)
          </Label>
          <CategoryAutocomplete
            value={targetCategory}
            onChange={setTargetCategory}
            suggestions={categorySuggestions}
            placeholder="Keep original categories"
            data-testid="import-target-category"
          />
        </div>
      </div>

      {/* Features Preview */}
      <div className="space-y-2">
        <Label className="text-muted-foreground">Features to import</Label>
        <div className="max-h-40 overflow-y-auto rounded-md border border-border/50 bg-muted/30 p-2 text-sm">
          {conflicts.map((c) => (
            <div
              key={c.featureId}
              className={cn(
                'py-1 px-2 flex items-center gap-2',
                c.hasConflict && !overwrite ? 'text-warning' : 'text-muted-foreground'
              )}
            >
              {c.hasConflict ? (
                overwrite ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />
                )
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
              )}
              <span className="truncate">{c.title || c.featureId}</span>
              {c.hasConflict && !overwrite && (
                <span className="text-xs text-warning">(will skip)</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderResultStep = () => {
    const successResults = importResults.filter((r) => r.success);
    const failedResults = importResults.filter((r) => !r.success);

    return (
      <div className="py-4 space-y-4">
        {/* Summary */}
        <div className="flex items-center gap-4 justify-center">
          {successResults.length > 0 && (
            <div className="flex items-center gap-2 text-primary">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">{successResults.length} imported</span>
            </div>
          )}
          {failedResults.length > 0 && (
            <div className="flex items-center gap-2 text-destructive">
              <XCircle className="w-5 h-5" />
              <span className="font-medium">{failedResults.length} failed</span>
            </div>
          )}
        </div>

        {/* Results List */}
        <div className="max-h-60 overflow-y-auto rounded-md border border-border/50 bg-muted/30 p-2 text-sm space-y-1">
          {importResults.map((result, idx) => (
            <div
              key={idx}
              className={cn(
                'py-1.5 px-2 rounded',
                result.success ? 'text-foreground' : 'text-destructive bg-destructive/10'
              )}
            >
              <div className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
                )}
                <span className="truncate">{result.featureId || `Feature ${idx + 1}`}</span>
                {result.wasOverwritten && (
                  <span className="text-xs text-muted-foreground">(overwritten)</span>
                )}
              </div>
              {result.warnings && result.warnings.length > 0 && (
                <div className="mt-1 pl-5 text-xs text-warning">
                  {result.warnings.map((w, i) => (
                    <div key={i}>{w}</div>
                  ))}
                </div>
              )}
              {result.errors && result.errors.length > 0 && (
                <div className="mt-1 pl-5 text-xs text-destructive">
                  {result.errors.map((e, i) => (
                    <div key={i}>{e}</div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="import-features-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Import Features
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Import features from a JSON or YAML export file.'}
            {step === 'review' && 'Review and configure import options.'}
            {step === 'result' && 'Import completed.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && renderUploadStep()}
        {step === 'review' && renderReviewStep()}
        {step === 'result' && renderResultStep()}

        <DialogFooter>
          {step === 'upload' && (
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          )}
          {step === 'review' && (
            <>
              <Button variant="ghost" onClick={() => setStep('upload')}>
                Back
              </Button>
              <Button onClick={handleImport} disabled={isImporting} data-testid="confirm-import">
                <Upload className="w-4 h-4 mr-2" />
                {isImporting
                  ? 'Importing...'
                  : `Import ${hasConflicts && !overwrite ? conflicts.filter((c) => !c.hasConflict).length : conflicts.length} Feature(s)`}
              </Button>
            </>
          )}
          {step === 'result' && (
            <Button onClick={() => onOpenChange(false)} data-testid="close-import">
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
