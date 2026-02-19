import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { GitBranch, Workflow } from 'lucide-react';
import { usePipelineConfig } from '@/hooks/queries/use-pipeline';
import { cn } from '@/lib/utils';

interface PipelineExclusionControlsProps {
  projectPath: string | undefined;
  excludedPipelineSteps: string[];
  onExcludedStepsChange: (excludedSteps: string[]) => void;
  testIdPrefix?: string;
  disabled?: boolean;
}

/**
 * Component for selecting which custom pipeline steps should be excluded for a feature.
 * Each pipeline step is shown as a toggleable switch, defaulting to enabled (included).
 * Disabling a step adds it to the exclusion list.
 */
export function PipelineExclusionControls({
  projectPath,
  excludedPipelineSteps,
  onExcludedStepsChange,
  testIdPrefix = 'pipeline-exclusion',
  disabled = false,
}: PipelineExclusionControlsProps) {
  const { data: pipelineConfig, isLoading } = usePipelineConfig(projectPath);

  // Sort steps by order
  const sortedSteps = [...(pipelineConfig?.steps || [])].sort((a, b) => a.order - b.order);

  // If no pipeline steps exist or loading, don't render anything
  if (isLoading || sortedSteps.length === 0) {
    return null;
  }

  const toggleStep = (stepId: string) => {
    const isCurrentlyExcluded = excludedPipelineSteps.includes(stepId);
    if (isCurrentlyExcluded) {
      // Remove from exclusions (enable the step)
      onExcludedStepsChange(excludedPipelineSteps.filter((id) => id !== stepId));
    } else {
      // Add to exclusions (disable the step)
      onExcludedStepsChange([...excludedPipelineSteps, stepId]);
    }
  };

  const allExcluded = sortedSteps.every((step) => excludedPipelineSteps.includes(step.id));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Workflow className="w-4 h-4 text-muted-foreground" />
        <Label className="text-sm font-medium">Custom Pipeline Steps</Label>
      </div>

      <div className="space-y-2">
        {sortedSteps.map((step) => {
          const isIncluded = !excludedPipelineSteps.includes(step.id);
          return (
            <div
              key={step.id}
              className={cn(
                'flex items-center justify-between gap-3 px-3 py-2 rounded-md border',
                isIncluded
                  ? 'border-border/50 bg-muted/30'
                  : 'border-border/30 bg-muted/10 opacity-60'
              )}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div
                  className={cn(
                    'w-2 h-2 rounded-full flex-shrink-0',
                    step.colorClass || 'bg-gray-400'
                  )}
                  style={{
                    backgroundColor: step.colorClass?.startsWith('#') ? step.colorClass : undefined,
                  }}
                />
                <span
                  className={cn(
                    'text-sm truncate',
                    isIncluded ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {step.name}
                </span>
              </div>
              <Switch
                checked={isIncluded}
                onCheckedChange={() => toggleStep(step.id)}
                disabled={disabled}
                data-testid={`${testIdPrefix}-step-${step.id}`}
                aria-label={`${isIncluded ? 'Disable' : 'Enable'} ${step.name} pipeline step`}
              />
            </div>
          );
        })}
      </div>

      {allExcluded && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <GitBranch className="w-3.5 h-3.5" />
          All pipeline steps disabled. Feature will skip directly to verification.
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        Enabled steps will run after implementation. Disable steps to skip them for this feature.
      </p>
    </div>
  );
}
