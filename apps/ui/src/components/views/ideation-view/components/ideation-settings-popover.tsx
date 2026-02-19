/**
 * IdeationSettingsPopover - Configure context sources for idea generation
 */

import { useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Settings2, FileText, Brain, LayoutGrid, Lightbulb, ScrollText } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useIdeationStore } from '@/store/ideation-store';
import { DEFAULT_IDEATION_CONTEXT_SOURCES, type IdeationContextSources } from '@automaker/types';

interface IdeationSettingsPopoverProps {
  projectPath: string;
}

const IDEATION_CONTEXT_OPTIONS: Array<{
  key: keyof IdeationContextSources;
  label: string;
  description: string;
  icon: typeof FileText;
}> = [
  {
    key: 'useAppSpec',
    label: 'App Specification',
    description: 'Overview, capabilities, features',
    icon: ScrollText,
  },
  {
    key: 'useContextFiles',
    label: 'Context Files',
    description: '.automaker/context/*.md|.txt',
    icon: FileText,
  },
  {
    key: 'useMemoryFiles',
    label: 'Memory Files',
    description: '.automaker/memory/*.md',
    icon: Brain,
  },
  {
    key: 'useExistingFeatures',
    label: 'Existing Features',
    description: 'Board features list',
    icon: LayoutGrid,
  },
  {
    key: 'useExistingIdeas',
    label: 'Existing Ideas',
    description: 'Ideation ideas list',
    icon: Lightbulb,
  },
];

/**
 * Renders a settings popover to toggle per-project ideation context sources.
 * Merges defaults with stored overrides and persists changes via the ideation store.
 */
export function IdeationSettingsPopover({ projectPath }: IdeationSettingsPopoverProps) {
  const { projectOverrides, setContextSource } = useIdeationStore(
    useShallow((state) => ({
      projectOverrides: state.contextSourcesByProject[projectPath],
      setContextSource: state.setContextSource,
    }))
  );
  const contextSources = useMemo(
    () => ({ ...DEFAULT_IDEATION_CONTEXT_SOURCES, ...projectOverrides }),
    [projectOverrides]
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="p-1 border rounded hover:bg-accent/50 transition-colors"
          title="Generation Settings"
          aria-label="Generation settings"
          data-testid="ideation-context-settings-button"
        >
          <Settings2 className="w-4 h-4 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end" sideOffset={8}>
        <div className="space-y-3">
          <div>
            <h4 className="font-medium text-sm mb-1">Generation Settings</h4>
            <p className="text-xs text-muted-foreground">
              Configure which context sources are included when generating ideas.
            </p>
          </div>

          <div className="space-y-2">
            {IDEATION_CONTEXT_OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <div
                  key={option.key}
                  className="flex items-center justify-between gap-3 p-2 rounded-md bg-secondary/50"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Icon className="w-4 h-4 text-brand-500 shrink-0" />
                    <div className="min-w-0">
                      <Label
                        htmlFor={`ideation-context-toggle-${option.key}`}
                        className="text-xs font-medium cursor-pointer block"
                      >
                        {option.label}
                      </Label>
                      <span className="text-[10px] text-muted-foreground truncate block">
                        {option.description}
                      </span>
                    </div>
                  </div>
                  <Switch
                    id={`ideation-context-toggle-${option.key}`}
                    checked={contextSources[option.key]}
                    onCheckedChange={(checked) =>
                      setContextSource(projectPath, option.key, checked)
                    }
                    data-testid={`ideation-context-toggle-${option.key}`}
                  />
                </div>
              );
            })}
          </div>

          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Disable sources to generate more focused ideas or reduce context size.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
