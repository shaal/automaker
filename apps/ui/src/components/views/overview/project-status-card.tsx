/**
 * ProjectStatusCard - Individual project card for multi-project dashboard
 *
 * Displays project health, feature counts, and agent status with quick navigation.
 */

import { useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAppStore } from '@/store/app-store';
import { initializeProject } from '@/lib/project-init';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { ProjectStatus, ProjectHealthStatus } from '@automaker/types';
import { Folder, Activity, CheckCircle2, XCircle, Clock, Pause, Bot, Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ProjectStatusCardProps {
  project: ProjectStatus;
  onProjectClick?: (projectId: string) => void;
}

const healthStatusConfig: Record<
  ProjectHealthStatus,
  { icon: typeof Activity; color: string; label: string; bgColor: string }
> = {
  active: {
    icon: Activity,
    color: 'text-green-500',
    label: 'Active',
    bgColor: 'bg-green-500/10',
  },
  idle: {
    icon: Pause,
    color: 'text-muted-foreground',
    label: 'Idle',
    bgColor: 'bg-muted/50',
  },
  waiting: {
    icon: Clock,
    color: 'text-yellow-500',
    label: 'Waiting',
    bgColor: 'bg-yellow-500/10',
  },
  completed: {
    icon: CheckCircle2,
    color: 'text-blue-500',
    label: 'Completed',
    bgColor: 'bg-blue-500/10',
  },
  error: {
    icon: XCircle,
    color: 'text-red-500',
    label: 'Error',
    bgColor: 'bg-red-500/10',
  },
};

export function ProjectStatusCard({ project, onProjectClick }: ProjectStatusCardProps) {
  const navigate = useNavigate();
  const { upsertAndSetCurrentProject } = useAppStore();

  const statusConfig = healthStatusConfig[project.healthStatus];
  const StatusIcon = statusConfig.icon;

  const handleClick = useCallback(async () => {
    if (onProjectClick) {
      onProjectClick(project.projectId);
      return;
    }

    // Default behavior: navigate to project
    try {
      const initResult = await initializeProject(project.projectPath);
      if (!initResult.success) {
        toast.error('Failed to open project', {
          description: initResult.error || 'Unknown error',
        });
        return;
      }

      upsertAndSetCurrentProject(project.projectPath, project.projectName);
      navigate({ to: '/board' });
    } catch (error) {
      toast.error('Failed to open project', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, [project, onProjectClick, upsertAndSetCurrentProject, navigate]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        'group relative rounded-xl border bg-card/60 backdrop-blur-sm transition-all duration-300 cursor-pointer hover:-translate-y-0.5',
        project.healthStatus === 'active' && 'border-green-500/30 hover:border-green-500/50',
        project.healthStatus === 'error' && 'border-red-500/30 hover:border-red-500/50',
        project.healthStatus === 'waiting' && 'border-yellow-500/30 hover:border-yellow-500/50',
        project.healthStatus === 'completed' && 'border-blue-500/30 hover:border-blue-500/50',
        project.healthStatus === 'idle' && 'border-border hover:border-brand-500/40'
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={`Open project ${project.projectName}`}
      data-testid={`project-status-card-${project.projectId}`}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                statusConfig.bgColor
              )}
            >
              <Folder className={cn('w-5 h-5', statusConfig.color)} />
            </div>
            <div className="min-w-0">
              <h3 className="font-medium text-foreground truncate group-hover:text-brand-500 transition-colors">
                {project.projectName}
              </h3>
              <p className="text-xs text-muted-foreground truncate">{project.projectPath}</p>
            </div>
          </div>

          {/* Status badge */}
          <div className="flex items-center gap-2 shrink-0">
            {project.unreadNotificationCount > 0 && (
              <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                <Bell className="w-3 h-3 mr-1" />
                {project.unreadNotificationCount}
              </Badge>
            )}
            <Badge
              variant="outline"
              className={cn(
                'h-6 px-2 text-xs gap-1',
                statusConfig.color,
                project.healthStatus === 'active' && 'border-green-500/30 bg-green-500/10',
                project.healthStatus === 'error' && 'border-red-500/30 bg-red-500/10'
              )}
            >
              <StatusIcon className="w-3 h-3" />
              {statusConfig.label}
            </Badge>
          </div>
        </div>

        {/* Feature counts */}
        <div className="flex flex-wrap gap-2 mb-3">
          {project.featureCounts.running > 0 && (
            <div className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-md bg-green-500/10 text-green-600 dark:text-green-400">
              <Activity className="w-3 h-3" />
              {project.featureCounts.running} running
            </div>
          )}
          {project.featureCounts.pending > 0 && (
            <div className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-md bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
              <Clock className="w-3 h-3" />
              {project.featureCounts.pending} pending
            </div>
          )}
          {project.featureCounts.completed > 0 && (
            <div className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <CheckCircle2 className="w-3 h-3" />
              {project.featureCounts.completed} completed
            </div>
          )}
          {project.featureCounts.failed > 0 && (
            <div className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-md bg-red-500/10 text-red-600 dark:text-red-400">
              <XCircle className="w-3 h-3" />
              {project.featureCounts.failed} failed
            </div>
          )}
          {project.featureCounts.verified > 0 && (
            <div className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <CheckCircle2 className="w-3 h-3" />
              {project.featureCounts.verified} verified
            </div>
          )}
        </div>

        {/* Footer: Total features and auto-mode status */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
          <span>{project.totalFeatures} total features</span>
          {project.isAutoModeRunning && (
            <div className="flex items-center gap-1.5 text-green-500">
              <Bot className="w-3.5 h-3.5 animate-pulse" />
              <span className="font-medium">Auto-mode active</span>
            </div>
          )}
          {project.lastActivityAt && !project.isAutoModeRunning && (
            <span>Last activity: {new Date(project.lastActivityAt).toLocaleDateString()}</span>
          )}
        </div>
      </div>
    </div>
  );
}
