import { useState, useEffect, useCallback, type KeyboardEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Terminal, Save, RotateCcw, Info, X, Play, FlaskConical } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { useProjectSettings } from '@/hooks/queries';
import { useUpdateProjectSettings } from '@/hooks/mutations';
import type { Project } from '@/lib/electron';

/** Preset dev server commands for quick selection */
const DEV_SERVER_PRESETS = [
  { label: 'npm run dev', command: 'npm run dev' },
  { label: 'yarn dev', command: 'yarn dev' },
  { label: 'pnpm dev', command: 'pnpm dev' },
  { label: 'bun dev', command: 'bun dev' },
  { label: 'npm start', command: 'npm start' },
  { label: 'cargo watch', command: 'cargo watch -x run' },
  { label: 'go run', command: 'go run .' },
] as const;

/** Preset test commands for quick selection */
const TEST_PRESETS = [
  { label: 'npm test', command: 'npm test' },
  { label: 'yarn test', command: 'yarn test' },
  { label: 'pnpm test', command: 'pnpm test' },
  { label: 'bun test', command: 'bun test' },
  { label: 'pytest', command: 'pytest' },
  { label: 'cargo test', command: 'cargo test' },
  { label: 'go test', command: 'go test ./...' },
] as const;

interface CommandsSectionProps {
  project: Project;
}

export function CommandsSection({ project }: CommandsSectionProps) {
  // Fetch project settings using TanStack Query
  const { data: projectSettings, isLoading, isError } = useProjectSettings(project.path);

  // Mutation hook for updating project settings
  const updateSettingsMutation = useUpdateProjectSettings(project.path);

  // Local state for the input fields
  const [devCommand, setDevCommand] = useState('');
  const [originalDevCommand, setOriginalDevCommand] = useState('');
  const [testCommand, setTestCommand] = useState('');
  const [originalTestCommand, setOriginalTestCommand] = useState('');

  // Sync local state when project settings load or project changes
  useEffect(() => {
    // Reset local state when project changes to avoid showing stale values
    setDevCommand('');
    setOriginalDevCommand('');
    setTestCommand('');
    setOriginalTestCommand('');
  }, [project.path]);

  useEffect(() => {
    if (projectSettings) {
      const dev = projectSettings.devCommand || '';
      const test = projectSettings.testCommand || '';
      setDevCommand(dev);
      setOriginalDevCommand(dev);
      setTestCommand(test);
      setOriginalTestCommand(test);
    }
  }, [projectSettings]);

  // Check if there are unsaved changes
  const hasDevChanges = devCommand !== originalDevCommand;
  const hasTestChanges = testCommand !== originalTestCommand;
  const hasChanges = hasDevChanges || hasTestChanges;
  const isSaving = updateSettingsMutation.isPending;

  // Save all commands
  const handleSave = useCallback(() => {
    const normalizedDevCommand = devCommand.trim();
    const normalizedTestCommand = testCommand.trim();

    updateSettingsMutation.mutate(
      {
        devCommand: normalizedDevCommand || null,
        testCommand: normalizedTestCommand || null,
      },
      {
        onSuccess: () => {
          setDevCommand(normalizedDevCommand);
          setOriginalDevCommand(normalizedDevCommand);
          setTestCommand(normalizedTestCommand);
          setOriginalTestCommand(normalizedTestCommand);
        },
      }
    );
  }, [devCommand, testCommand, updateSettingsMutation]);

  // Reset to original values
  const handleReset = useCallback(() => {
    setDevCommand(originalDevCommand);
    setTestCommand(originalTestCommand);
  }, [originalDevCommand, originalTestCommand]);

  // Use a preset command
  const handleUseDevPreset = useCallback((command: string) => {
    setDevCommand(command);
  }, []);

  const handleUseTestPreset = useCallback((command: string) => {
    setTestCommand(command);
  }, []);

  // Clear commands
  const handleClearDev = useCallback(() => {
    setDevCommand('');
  }, []);

  const handleClearTest = useCallback(() => {
    setTestCommand('');
  }, []);

  // Handle keyboard shortcuts (Enter to save)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && hasChanges && !isSaving) {
        e.preventDefault();
        handleSave();
      }
    },
    [hasChanges, isSaving, handleSave]
  );

  return (
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
            <Terminal className="w-5 h-5 text-brand-500" />
          </div>
          <h2 className="text-lg font-semibold text-foreground tracking-tight">Project Commands</h2>
        </div>
        <p className="text-sm text-muted-foreground/80 ml-12">
          Configure custom commands for development and testing.
        </p>
      </div>

      <div className="p-6 space-y-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="md" />
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center py-8 text-sm text-destructive">
            Failed to load project settings. Please try again.
          </div>
        ) : (
          <>
            {/* Dev Server Command Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 text-brand-500" />
                <h3 className="text-base font-medium text-foreground">Dev Server</h3>
                {hasDevChanges && (
                  <span className="text-xs text-amber-500 font-medium">(unsaved)</span>
                )}
              </div>

              <div className="space-y-3 pl-6">
                <div className="relative">
                  <Input
                    id="dev-command"
                    value={devCommand}
                    onChange={(e) => setDevCommand(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="e.g., npm run dev, yarn dev, cargo watch"
                    className="font-mono text-sm pr-8"
                    data-testid="dev-command-input"
                  />
                  {devCommand && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearDev}
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                      aria-label="Clear dev command"
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground/80">
                  Leave empty to auto-detect based on your package manager.
                </p>

                {/* Dev Presets */}
                <div className="flex flex-wrap gap-1.5">
                  {DEV_SERVER_PRESETS.map((preset) => (
                    <Button
                      key={preset.command}
                      variant="outline"
                      size="sm"
                      onClick={() => handleUseDevPreset(preset.command)}
                      className="text-xs font-mono h-7 px-2"
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-border/30" />

            {/* Test Command Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-brand-500" />
                <h3 className="text-base font-medium text-foreground">Test Runner</h3>
                {hasTestChanges && (
                  <span className="text-xs text-amber-500 font-medium">(unsaved)</span>
                )}
              </div>

              <div className="space-y-3 pl-6">
                <div className="relative">
                  <Input
                    id="test-command"
                    value={testCommand}
                    onChange={(e) => setTestCommand(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="e.g., npm test, pytest, cargo test"
                    className="font-mono text-sm pr-8"
                    data-testid="test-command-input"
                  />
                  {testCommand && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearTest}
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                      aria-label="Clear test command"
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground/80">
                  Leave empty to auto-detect based on your project structure.
                </p>

                {/* Test Presets */}
                <div className="flex flex-wrap gap-1.5">
                  {TEST_PRESETS.map((preset) => (
                    <Button
                      key={preset.command}
                      variant="outline"
                      size="sm"
                      onClick={() => handleUseTestPreset(preset.command)}
                      className="text-xs font-mono h-7 px-2"
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Auto-detection Info */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/20 border border-border/30">
              <Info className="w-4 h-4 text-brand-500 mt-0.5 shrink-0" />
              <div className="text-xs text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Auto-detection</p>
                <p>
                  When no custom command is set, the system automatically detects your package
                  manager and test framework based on project files (package.json, Cargo.toml,
                  go.mod, etc.).
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={!hasChanges || isSaving}
                className="gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                className="gap-1.5"
              >
                {isSaving ? <Spinner size="xs" /> : <Save className="w-3.5 h-3.5" />}
                Save
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
