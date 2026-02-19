import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Database, Download, Upload } from 'lucide-react';
import { ExportFeaturesDialog } from '../board-view/dialogs/export-features-dialog';
import { ImportFeaturesDialog } from '../board-view/dialogs/import-features-dialog';
import { useBoardFeatures } from '../board-view/hooks';
import type { Project } from '@/lib/electron';

interface DataManagementSectionProps {
  project: Project;
}

export function DataManagementSection({ project }: DataManagementSectionProps) {
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);

  // Fetch features and persisted categories using the existing hook
  const { features, persistedCategories, loadFeatures } = useBoardFeatures({
    currentProject: project,
  });

  return (
    <>
      <div
        className={cn(
          'rounded-2xl overflow-hidden',
          'border border-border/50',
          'bg-gradient-to-br from-card/90 via-card/70 to-card/80 backdrop-blur-xl',
          'shadow-sm shadow-black/5'
        )}
      >
        <div className="p-6 border-b border-border/50 bg-gradient-to-r from-transparent via-accent/5 to-transparent">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500/20 to-brand-600/10 flex items-center justify-center border border-brand-500/20">
              <Database className="w-5 h-5 text-brand-500" />
            </div>
            <h2 className="text-lg font-semibold text-foreground tracking-tight">
              Data Management
            </h2>
          </div>
          <p className="text-sm text-muted-foreground/80 ml-12">
            Export and import features to backup your data or share with other projects.
          </p>
        </div>
        <div className="p-6 space-y-6">
          {/* Export Section */}
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-medium text-foreground">Export Features</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Download all features as a JSON or YAML file for backup or sharing.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowExportDialog(true)}
              className="gap-2"
              data-testid="export-features-button"
            >
              <Download className="w-4 h-4" />
              Export Features
            </Button>
          </div>

          {/* Separator */}
          <div className="border-t border-border/50" />

          {/* Import Section */}
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-medium text-foreground">Import Features</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Import features from a previously exported JSON or YAML file.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowImportDialog(true)}
              className="gap-2"
              data-testid="import-features-button"
            >
              <Upload className="w-4 h-4" />
              Import Features
            </Button>
          </div>
        </div>
      </div>

      {/* Export Dialog */}
      <ExportFeaturesDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        projectPath={project.path}
        features={features}
      />

      {/* Import Dialog */}
      <ImportFeaturesDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        projectPath={project.path}
        categorySuggestions={persistedCategories}
        onImportComplete={() => {
          loadFeatures();
        }}
      />
    </>
  );
}
