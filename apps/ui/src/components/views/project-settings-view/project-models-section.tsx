import { useState } from 'react';
import { useAppStore } from '@/store/app-store';
import { Button } from '@/components/ui/button';
import { Workflow, RotateCcw, Globe, Check, Replace, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Project } from '@/lib/electron';
import { PhaseModelSelector } from '@/components/views/settings-view/model-defaults/phase-model-selector';
import { ProjectBulkReplaceDialog } from './project-bulk-replace-dialog';
import type { PhaseModelKey, PhaseModelEntry } from '@automaker/types';
import { DEFAULT_PHASE_MODELS, DEFAULT_GLOBAL_SETTINGS } from '@automaker/types';

interface ProjectModelsSectionProps {
  project: Project;
}

interface PhaseConfig {
  key: PhaseModelKey;
  label: string;
  description: string;
}

const QUICK_TASKS: PhaseConfig[] = [
  {
    key: 'enhancementModel',
    label: 'Feature Enhancement',
    description: 'Improves feature names and descriptions',
  },
  {
    key: 'fileDescriptionModel',
    label: 'File Descriptions',
    description: 'Generates descriptions for context files',
  },
  {
    key: 'imageDescriptionModel',
    label: 'Image Descriptions',
    description: 'Analyzes and describes context images',
  },
  {
    key: 'commitMessageModel',
    label: 'Commit Messages',
    description: 'Generates git commit messages from diffs',
  },
];

const VALIDATION_TASKS: PhaseConfig[] = [
  {
    key: 'validationModel',
    label: 'GitHub Issue Validation',
    description: 'Validates and improves GitHub issues',
  },
];

const GENERATION_TASKS: PhaseConfig[] = [
  {
    key: 'specGenerationModel',
    label: 'App Specification',
    description: 'Generates full application specifications',
  },
  {
    key: 'featureGenerationModel',
    label: 'Feature Generation',
    description: 'Creates features from specifications',
  },
  {
    key: 'backlogPlanningModel',
    label: 'Backlog Planning',
    description: 'Reorganizes and prioritizes backlog',
  },
  {
    key: 'projectAnalysisModel',
    label: 'Project Analysis',
    description: 'Analyzes project structure for suggestions',
  },
  {
    key: 'ideationModel',
    label: 'Ideation',
    description: 'Model for ideation view (generating AI suggestions)',
  },
];

const MEMORY_TASKS: PhaseConfig[] = [
  {
    key: 'memoryExtractionModel',
    label: 'Memory Extraction',
    description: 'Extracts learnings from completed agent sessions',
  },
];

/**
 * Default feature model override section for per-project settings.
 */
function FeatureDefaultModelOverrideSection({ project }: { project: Project }) {
  const {
    defaultFeatureModel: globalDefaultFeatureModel,
    setProjectDefaultFeatureModel,
    claudeCompatibleProviders,
  } = useAppStore();

  const globalValue: PhaseModelEntry =
    globalDefaultFeatureModel ?? DEFAULT_GLOBAL_SETTINGS.defaultFeatureModel;
  const projectOverride = project.defaultFeatureModel;
  const hasOverride = !!projectOverride;
  const effectiveValue = projectOverride || globalValue;

  /**
   * Formats a user-friendly model label using provider metadata when available,
   * falling back to known Claude aliases or the raw model id.
   */
  const getModelDisplayName = (entry: PhaseModelEntry): string => {
    if (entry.providerId) {
      const provider = (claudeCompatibleProviders || []).find((p) => p.id === entry.providerId);
      if (provider) {
        const model = provider.models?.find((m) => m.id === entry.model);
        if (model) {
          return `${model.displayName} (${provider.name})`;
        }
      }
    }
    // Default to model ID for built-in models (both short aliases and canonical IDs)
    const modelMap: Record<string, string> = {
      haiku: 'Claude Haiku',
      sonnet: 'Claude Sonnet',
      opus: 'Claude Opus',
      'claude-haiku': 'Claude Haiku',
      'claude-sonnet': 'Claude Sonnet',
      'claude-opus': 'Claude Opus',
    };
    return modelMap[entry.model] || entry.model;
  };

  /**
   * Clears the project-level model override for this scope.
   */
  const handleClearOverride = () => {
    setProjectDefaultFeatureModel(project.id, null);
  };

  /**
   * Sets the project-level model override for this scope.
   */
  const handleSetOverride = (entry: PhaseModelEntry) => {
    setProjectDefaultFeatureModel(project.id, entry);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-foreground">Feature Defaults</h3>
        <p className="text-xs text-muted-foreground">
          Default model for new feature cards in this project
        </p>
      </div>
      <div className="space-y-3">
        <div
          className={cn(
            'flex items-center justify-between p-4 rounded-xl',
            'bg-accent/20 border',
            hasOverride ? 'border-brand-500/30 bg-brand-500/5' : 'border-border/30',
            'hover:bg-accent/30 transition-colors'
          )}
        >
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-brand-500" />
              </div>
              <h4 className="text-sm font-medium text-foreground">Default Feature Model</h4>
              {hasOverride ? (
                <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-brand-500/20 text-brand-500">
                  Override
                </span>
              ) : (
                <span className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded bg-muted text-muted-foreground">
                  <Globe className="w-3 h-3" />
                  Global
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 ml-10">
              Model and thinking level used when creating new feature cards
            </p>
            {hasOverride && (
              <p className="text-xs text-brand-500 mt-1 ml-10">
                Using: {getModelDisplayName(effectiveValue)}
              </p>
            )}
            {!hasOverride && (
              <p className="text-xs text-muted-foreground/70 mt-1 ml-10">
                Using global: {getModelDisplayName(globalValue)}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {hasOverride && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearOverride}
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Reset
              </Button>
            )}
            <PhaseModelSelector
              compact
              value={effectiveValue}
              onChange={handleSetOverride}
              align="end"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Renders a single phase override row, showing the effective model
 * (project override or global default) and wiring selector/reset actions.
 */
function PhaseOverrideItem({
  phase,
  project,
  globalValue,
  projectOverride,
}: {
  phase: PhaseConfig;
  project: Project;
  globalValue: PhaseModelEntry;
  projectOverride?: PhaseModelEntry;
}) {
  const { setProjectPhaseModelOverride, claudeCompatibleProviders } = useAppStore();

  const hasOverride = !!projectOverride;
  const effectiveValue = projectOverride || globalValue;

  /**
   * Formats a user-friendly model label using provider metadata when available,
   * falling back to known Claude aliases or the raw model id.
   */
  const getModelDisplayName = (entry: PhaseModelEntry): string => {
    if (entry.providerId) {
      const provider = (claudeCompatibleProviders || []).find((p) => p.id === entry.providerId);
      if (provider) {
        const model = provider.models?.find((m) => m.id === entry.model);
        if (model) {
          return `${model.displayName} (${provider.name})`;
        }
      }
    }
    // Default to model ID for built-in models (both short aliases and canonical IDs)
    const modelMap: Record<string, string> = {
      haiku: 'Claude Haiku',
      sonnet: 'Claude Sonnet',
      opus: 'Claude Opus',
      'claude-haiku': 'Claude Haiku',
      'claude-sonnet': 'Claude Sonnet',
      'claude-opus': 'Claude Opus',
    };
    return modelMap[entry.model] || entry.model;
  };

  /**
   * Clears the project-level model override for this scope.
   */
  const handleClearOverride = () => {
    setProjectPhaseModelOverride(project.id, phase.key, null);
  };

  /**
   * Sets the project-level model override for this scope.
   */
  const handleSetOverride = (entry: PhaseModelEntry) => {
    setProjectPhaseModelOverride(project.id, phase.key, entry);
  };

  return (
    <div
      className={cn(
        'flex items-center justify-between p-4 rounded-xl',
        'bg-accent/20 border',
        hasOverride ? 'border-brand-500/30 bg-brand-500/5' : 'border-border/30',
        'hover:bg-accent/30 transition-colors'
      )}
    >
      <div className="flex-1 pr-4">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium text-foreground">{phase.label}</h4>
          {hasOverride ? (
            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-brand-500/20 text-brand-500">
              Override
            </span>
          ) : (
            <span className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded bg-muted text-muted-foreground">
              <Globe className="w-3 h-3" />
              Global
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{phase.description}</p>
        {hasOverride && (
          <p className="text-xs text-brand-500 mt-1">
            Using: {getModelDisplayName(effectiveValue)}
          </p>
        )}
        {!hasOverride && (
          <p className="text-xs text-muted-foreground/70 mt-1">
            Using global: {getModelDisplayName(globalValue)}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {hasOverride && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearOverride}
            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Reset
          </Button>
        )}
        <PhaseModelSelector
          compact
          value={effectiveValue}
          onChange={handleSetOverride}
          align="end"
        />
      </div>
    </div>
  );
}

/**
 * Renders a titled group of phase override rows and resolves each phase's
 * global default model with a fallback to DEFAULT_PHASE_MODELS.
 */
function PhaseGroup({
  title,
  subtitle,
  phases,
  project,
}: {
  title: string;
  subtitle: string;
  phases: PhaseConfig[];
  project: Project;
}) {
  const { phaseModels } = useAppStore();
  const projectOverrides = project.phaseModelOverrides || {};

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <div className="space-y-3">
        {phases.map((phase) => (
          <PhaseOverrideItem
            key={phase.key}
            phase={phase}
            project={project}
            globalValue={phaseModels[phase.key] ?? DEFAULT_PHASE_MODELS[phase.key]}
            projectOverride={projectOverrides[phase.key]}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Renders the per-project model overrides UI for all phase models.
 */
export function ProjectModelsSection({ project }: ProjectModelsSectionProps) {
  const { clearAllProjectPhaseModelOverrides, claudeCompatibleProviders } = useAppStore();
  const [showBulkReplace, setShowBulkReplace] = useState(false);

  // Count how many overrides are set (including defaultFeatureModel)
  const phaseOverrideCount = Object.keys(project.phaseModelOverrides || {}).length;
  const hasDefaultFeatureModelOverride = !!project.defaultFeatureModel;
  const overrideCount = phaseOverrideCount + (hasDefaultFeatureModelOverride ? 1 : 0);

  // Check if there are any enabled ClaudeCompatibleProviders
  const hasEnabledProviders =
    claudeCompatibleProviders && claudeCompatibleProviders.some((p) => p.enabled !== false);

  /**
   * Clears all project-level phase model overrides for this project.
   */
  const handleClearAll = () => {
    clearAllProjectPhaseModelOverrides(project.id);
  };

  return (
    <div
      className={cn(
        'rounded-2xl overflow-hidden',
        'border border-border/50',
        'bg-gradient-to-br from-card/90 via-card/70 to-card/80 backdrop-blur-xl',
        'shadow-sm shadow-black/5'
      )}
    >
      {/* Header */}
      <div className="p-6 border-b border-border/50 bg-gradient-to-r from-transparent via-accent/5 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500/20 to-brand-600/10 flex items-center justify-center border border-brand-500/20">
              <Workflow className="w-5 h-5 text-brand-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground tracking-tight">
                Model Overrides
              </h2>
              <p className="text-sm text-muted-foreground/80">
                Override AI models for this project only
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasEnabledProviders && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkReplace(true)}
                className="gap-2"
              >
                <Replace className="w-3.5 h-3.5" />
                Bulk Replace
              </Button>
            )}
            {overrideCount > 0 && (
              <Button variant="outline" size="sm" onClick={handleClearAll} className="gap-2">
                <RotateCcw className="w-3.5 h-3.5" />
                Reset All ({overrideCount})
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Replace Dialog */}
      <ProjectBulkReplaceDialog
        open={showBulkReplace}
        onOpenChange={setShowBulkReplace}
        project={project}
      />

      {/* Info Banner */}
      <div className="px-6 pt-6">
        <div className="p-3 rounded-lg bg-brand-500/5 border border-brand-500/20 text-sm text-muted-foreground">
          <div className="flex items-center gap-2 mb-1">
            <Check className="w-4 h-4 text-brand-500" />
            <span className="font-medium text-foreground">Per-Phase Overrides</span>
          </div>
          Override specific phases to use different models for this project. Phases without
          overrides use the global settings.
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-8">
        {/* Feature Defaults */}
        <FeatureDefaultModelOverrideSection project={project} />

        {/* Quick Tasks */}
        <PhaseGroup
          title="Quick Tasks"
          subtitle="Fast models recommended for speed and cost savings"
          phases={QUICK_TASKS}
          project={project}
        />

        {/* Validation Tasks */}
        <PhaseGroup
          title="Validation Tasks"
          subtitle="Smart models recommended for accuracy"
          phases={VALIDATION_TASKS}
          project={project}
        />

        {/* Generation Tasks */}
        <PhaseGroup
          title="Generation Tasks"
          subtitle="Powerful models recommended for quality output"
          phases={GENERATION_TASKS}
          project={project}
        />

        {/* Memory Tasks */}
        <PhaseGroup
          title="Memory Tasks"
          subtitle="Fast models recommended for learning extraction"
          phases={MEMORY_TASKS}
          project={project}
        />
      </div>
    </div>
  );
}
