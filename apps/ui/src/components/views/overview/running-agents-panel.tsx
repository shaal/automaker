/**
 * RunningAgentsPanel - Shows all currently running agents across projects
 *
 * Displays active AI agents with their status and quick access to features.
 */

import { useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAppStore } from '@/store/app-store';
import { initializeProject } from '@/lib/project-init';
import { toast } from 'sonner';
import type { ProjectStatus } from '@automaker/types';
import { Bot, Activity, GitBranch, ArrowRight } from 'lucide-react';

interface RunningAgentsPanelProps {
  projects: ProjectStatus[];
}

interface RunningAgent {
  projectId: string;
  projectName: string;
  projectPath: string;
  featureCount: number;
  isAutoMode: boolean;
  activeBranch?: string;
}

export function RunningAgentsPanel({ projects }: RunningAgentsPanelProps) {
  const navigate = useNavigate();
  const { upsertAndSetCurrentProject } = useAppStore();

  // Extract running agents from projects
  const runningAgents: RunningAgent[] = projects
    .filter((p) => p.isAutoModeRunning || p.featureCounts.running > 0)
    .map((p) => ({
      projectId: p.projectId,
      projectName: p.projectName,
      projectPath: p.projectPath,
      featureCount: p.featureCounts.running,
      isAutoMode: p.isAutoModeRunning,
      activeBranch: p.activeBranch,
    }));

  const handleAgentClick = useCallback(
    async (agent: RunningAgent) => {
      try {
        const initResult = await initializeProject(agent.projectPath);
        if (!initResult.success) {
          toast.error('Failed to open project', {
            description: initResult.error || 'Unknown error',
          });
          return;
        }

        upsertAndSetCurrentProject(agent.projectPath, agent.projectName);
        navigate({ to: '/board' });
      } catch (error) {
        toast.error('Failed to navigate to agent', {
          description: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
    [navigate, upsertAndSetCurrentProject]
  );

  const handleAgentKeyDown = useCallback(
    (e: React.KeyboardEvent, agent: RunningAgent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleAgentClick(agent);
      }
    },
    [handleAgentClick]
  );

  if (runningAgents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Bot className="w-8 h-8 mb-2 opacity-50" />
        <p className="text-sm">No agents running</p>
        <p className="text-xs mt-1">Start auto-mode on a project to see activity here</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {runningAgents.map((agent) => (
        <div
          key={agent.projectId}
          role="button"
          tabIndex={0}
          className="group flex items-center gap-3 p-3 rounded-lg border border-green-500/20 bg-green-500/5 hover:bg-green-500/10 cursor-pointer transition-all"
          onClick={() => handleAgentClick(agent)}
          onKeyDown={(e) => handleAgentKeyDown(e, agent)}
          aria-label={`View running agent for ${agent.projectName}`}
          data-testid={`running-agent-${agent.projectId}`}
        >
          {/* Animated icon */}
          <div className="relative w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center shrink-0">
            <Bot className="w-5 h-5 text-green-500" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground truncate group-hover:text-green-500 transition-colors">
                {agent.projectName}
              </span>
              {agent.isAutoMode && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/20 text-green-500 font-medium">
                  Auto
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
              {agent.featureCount > 0 && (
                <span className="flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  {agent.featureCount} feature{agent.featureCount !== 1 ? 's' : ''} running
                </span>
              )}
              {agent.activeBranch && (
                <span className="flex items-center gap-1">
                  <GitBranch className="w-3 h-3" />
                  {agent.activeBranch}
                </span>
              )}
            </div>
          </div>

          {/* Arrow */}
          <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      ))}
    </div>
  );
}
