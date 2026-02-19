import { useState, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Download, FileJson, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { getHttpApiClient } from '@/lib/http-api-client';
import type { Feature } from '@/store/app-store';

type ExportFormat = 'json' | 'yaml';

interface ExportFeaturesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectPath: string;
  features: Feature[];
  selectedFeatureIds?: string[];
}

export function ExportFeaturesDialog({
  open,
  onOpenChange,
  projectPath,
  features,
  selectedFeatureIds,
}: ExportFeaturesDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('json');
  const [includeHistory, setIncludeHistory] = useState(true);
  const [includePlanSpec, setIncludePlanSpec] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Determine which features to export
  const featuresToExport =
    selectedFeatureIds && selectedFeatureIds.length > 0
      ? features.filter((f) => selectedFeatureIds.includes(f.id))
      : features;

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setFormat('json');
      setIncludeHistory(true);
      setIncludePlanSpec(true);
    }
  }, [open]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const api = getHttpApiClient();
      const result = await api.features.export(projectPath, {
        featureIds: selectedFeatureIds,
        format,
        includeHistory,
        includePlanSpec,
        prettyPrint: true,
      });

      if (!result.success || !result.data) {
        toast.error(result.error || 'Failed to export features');
        return;
      }

      // Create a blob and trigger download
      const mimeType = format === 'json' ? 'application/json' : 'application/x-yaml';
      const blob = new Blob([result.data], { type: mimeType });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename || `features-export.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${featuresToExport.length} feature(s) to ${format.toUpperCase()}`);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to export features');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="export-features-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export Features
          </DialogTitle>
          <DialogDescription>
            Export {featuresToExport.length} feature(s) to a file for backup or sharing with other
            projects.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Format Selection */}
          <div className="space-y-2">
            <Label>Export Format</Label>
            <Select value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
              <SelectTrigger data-testid="export-format-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">
                  <div className="flex items-center gap-2">
                    <FileJson className="w-4 h-4" />
                    <span>JSON</span>
                  </div>
                </SelectItem>
                <SelectItem value="yaml">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span>YAML</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <Label>Options</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="include-history"
                  checked={includeHistory}
                  onCheckedChange={(checked) => setIncludeHistory(!!checked)}
                  data-testid="export-include-history"
                />
                <Label htmlFor="include-history" className="text-sm font-normal cursor-pointer">
                  Include description history
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="include-plan-spec"
                  checked={includePlanSpec}
                  onCheckedChange={(checked) => setIncludePlanSpec(!!checked)}
                  data-testid="export-include-plan-spec"
                />
                <Label htmlFor="include-plan-spec" className="text-sm font-normal cursor-pointer">
                  Include plan specifications
                </Label>
              </div>
            </div>
          </div>

          {/* Features to Export Preview */}
          {featuresToExport.length > 0 && featuresToExport.length <= 10 && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">Features to export</Label>
              <div className="max-h-32 overflow-y-auto rounded-md border border-border/50 bg-muted/30 p-2 text-sm">
                {featuresToExport.map((f) => (
                  <div key={f.id} className="py-1 px-2 truncate text-muted-foreground">
                    {f.title || f.description.slice(0, 50)}...
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isExporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting} data-testid="confirm-export">
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
