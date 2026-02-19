/**
 * OverviewView - Multi-project dashboard showing status across all projects
 *
 * Provides a unified view of all projects with active features, running agents,
 * recent completions, and alerts. Quick navigation to any project or feature.
 */

import { useState, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { createLogger } from '@automaker/utils/logger';
import { useMultiProjectStatus } from '@/hooks/use-multi-project-status';
import { useAppStore } from '@/store/app-store';
import { isElectron, getElectronAPI } from '@/lib/electron';
import { isMac } from '@/lib/utils';
import { initializeProject } from '@/lib/project-init';
import { getHttpApiClient } from '@/lib/http-api-client';
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NewProjectModal } from '@/components/dialogs/new-project-modal';
import { WorkspacePickerModal } from '@/components/dialogs/workspace-picker-modal';
import { ProjectStatusCard } from './overview/project-status-card';
import { RecentActivityFeed } from './overview/recent-activity-feed';
import { RunningAgentsPanel } from './overview/running-agents-panel';
import type { StarterTemplate } from '@/lib/templates';
import {
  LayoutDashboard,
  RefreshCw,
  Folder,
  FolderOpen,
  Plus,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Bot,
  Bell,
} from 'lucide-react';

const logger = createLogger('OverviewView');

export function OverviewView() {
  const navigate = useNavigate();
  const { overview, isLoading, error, refresh } = useMultiProjectStatus(15000); // Refresh every 15s
  const { upsertAndSetCurrentProject } = useAppStore();

  // Modal state
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showWorkspacePicker, setShowWorkspacePicker] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const initializeAndOpenProject = useCallback(
    async (path: string, name: string) => {
      try {
        const initResult = await initializeProject(path);
        if (!initResult.success) {
          toast.error('Failed to initialize project', {
            description: initResult.error || 'Unknown error occurred',
          });
          return;
        }

        upsertAndSetCurrentProject(path, name);

        toast.success('Project opened', { description: `Opened ${name}` });
        navigate({ to: '/board' });
      } catch (error) {
        logger.error('[Overview] Failed to open project:', error);
        toast.error('Failed to open project', {
          description: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
    [upsertAndSetCurrentProject, navigate]
  );

  const handleOpenProject = useCallback(async () => {
    try {
      const httpClient = getHttpApiClient();
      const configResult = await httpClient.workspace.getConfig();

      if (configResult.success && configResult.configured) {
        setShowWorkspacePicker(true);
      } else {
        const api = getElectronAPI();
        const result = await api.openDirectory();

        if (!result.canceled && result.filePaths[0]) {
          const path = result.filePaths[0];
          const name = path.split(/[/\\]/).filter(Boolean).pop() || 'Untitled Project';
          await initializeAndOpenProject(path, name);
        }
      }
    } catch (error) {
      logger.error('[Overview] Failed to check workspace config:', error);
      const api = getElectronAPI();
      const result = await api.openDirectory();

      if (!result.canceled && result.filePaths[0]) {
        const path = result.filePaths[0];
        const name = path.split(/[/\\]/).filter(Boolean).pop() || 'Untitled Project';
        await initializeAndOpenProject(path, name);
      }
    }
  }, [initializeAndOpenProject]);

  const handleWorkspaceSelect = useCallback(
    async (path: string, name: string) => {
      setShowWorkspacePicker(false);
      await initializeAndOpenProject(path, name);
    },
    [initializeAndOpenProject]
  );

  const handleCreateBlankProject = useCallback(
    async (projectName: string, parentDir: string) => {
      setIsCreating(true);
      try {
        const api = getElectronAPI();
        const projectPath = `${parentDir}/${projectName}`;

        await api.mkdir(projectPath);

        const initResult = await initializeProject(projectPath);
        if (!initResult.success) {
          toast.error('Failed to initialize project', {
            description: initResult.error || 'Unknown error occurred',
          });
          return;
        }

        await api.writeFile(
          `${projectPath}/.automaker/app_spec.txt`,
          `<project_specification>
  <project_name>${projectName}</project_name>
  <overview>Describe your project here.</overview>
  <technology_stack></technology_stack>
  <core_capabilities></core_capabilities>
  <implemented_features></implemented_features>
</project_specification>`
        );

        upsertAndSetCurrentProject(projectPath, projectName);
        setShowNewProjectModal(false);

        toast.success('Project created', { description: `Created ${projectName}` });
        navigate({ to: '/board' });
      } catch (error) {
        logger.error('Failed to create project:', error);
        toast.error('Failed to create project', {
          description: error instanceof Error ? error.message : 'Unknown error',
        });
      } finally {
        setIsCreating(false);
      }
    },
    [upsertAndSetCurrentProject, navigate]
  );

  const handleCreateFromTemplate = useCallback(
    async (template: StarterTemplate, projectName: string, parentDir: string) => {
      setIsCreating(true);
      try {
        const httpClient = getHttpApiClient();
        const cloneResult = await httpClient.templates.clone(
          template.repoUrl,
          projectName,
          parentDir
        );

        if (!cloneResult.success || !cloneResult.projectPath) {
          toast.error('Failed to clone template', {
            description: cloneResult.error || 'Unknown error occurred',
          });
          return;
        }

        const initResult = await initializeProject(cloneResult.projectPath);
        if (!initResult.success) {
          toast.error('Failed to initialize project', {
            description: initResult.error || 'Unknown error occurred',
          });
          return;
        }

        upsertAndSetCurrentProject(cloneResult.projectPath, projectName);
        setShowNewProjectModal(false);

        toast.success('Project created from template', {
          description: `Created ${projectName} from ${template.name}`,
        });
        navigate({ to: '/board' });
      } catch (error) {
        logger.error('Failed to create from template:', error);
        toast.error('Failed to create project', {
          description: error instanceof Error ? error.message : 'Unknown error',
        });
      } finally {
        setIsCreating(false);
      }
    },
    [upsertAndSetCurrentProject, navigate]
  );

  const handleCreateFromCustomUrl = useCallback(
    async (repoUrl: string, projectName: string, parentDir: string) => {
      setIsCreating(true);
      try {
        const httpClient = getHttpApiClient();
        const cloneResult = await httpClient.templates.clone(repoUrl, projectName, parentDir);

        if (!cloneResult.success || !cloneResult.projectPath) {
          toast.error('Failed to clone repository', {
            description: cloneResult.error || 'Unknown error occurred',
          });
          return;
        }

        const initResult = await initializeProject(cloneResult.projectPath);
        if (!initResult.success) {
          toast.error('Failed to initialize project', {
            description: initResult.error || 'Unknown error occurred',
          });
          return;
        }

        upsertAndSetCurrentProject(cloneResult.projectPath, projectName);
        setShowNewProjectModal(false);

        toast.success('Project created from repository', { description: `Created ${projectName}` });
        navigate({ to: '/board' });
      } catch (error) {
        logger.error('Failed to create from custom URL:', error);
        toast.error('Failed to create project', {
          description: error instanceof Error ? error.message : 'Unknown error',
        });
      } finally {
        setIsCreating(false);
      }
    },
    [upsertAndSetCurrentProject, navigate]
  );

  return (
    <div className="flex-1 flex flex-col h-screen content-bg" data-testid="overview-view">
      {/* Header */}
      <header className="shrink-0 border-b border-border bg-glass backdrop-blur-md">
        {/* Electron titlebar drag region */}
        {isElectron() && (
          <div
            className={`absolute top-0 left-0 right-0 h-6 titlebar-drag-region z-40 pointer-events-none ${isMac ? 'pl-20' : ''}`}
            aria-hidden="true"
          />
        )}
        <div className="px-4 sm:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 titlebar-no-drag">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center">
                <LayoutDashboard className="w-4 h-4 text-brand-500" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">Automaker Dashboard</h1>
                <p className="text-xs text-muted-foreground">
                  {overview ? `${overview.aggregate.projectCounts.total} projects` : 'Loading...'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 titlebar-no-drag">
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleOpenProject} className="gap-2">
              <FolderOpen className="w-4 h-4" />
              Open Project
            </Button>
            <Button
              size="sm"
              onClick={() => setShowNewProjectModal(true)}
              className="gap-2 bg-brand-500 hover:bg-brand-600 text-white"
            >
              <Plus className="w-4 h-4" />
              New Project
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {/* Loading state */}
        {isLoading && !overview && (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-4">
              <Spinner size="lg" />
              <p className="text-sm text-muted-foreground">Loading project overview...</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && !overview && (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h3 className="font-medium text-foreground mb-1">Failed to load overview</h3>
                <p className="text-sm text-muted-foreground mb-4">{error}</p>
                <Button variant="outline" size="sm" onClick={refresh}>
                  Try again
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        {overview && (
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Aggregate stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <Card className="bg-card/60">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <Folder className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {overview.aggregate.projectCounts.total}
                    </p>
                    <p className="text-xs text-muted-foreground">Projects</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/60">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <Activity className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {overview.aggregate.featureCounts.running}
                    </p>
                    <p className="text-xs text-muted-foreground">Running</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/60">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {overview.aggregate.featureCounts.pending}
                    </p>
                    <p className="text-xs text-muted-foreground">Pending</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/60">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {overview.aggregate.featureCounts.completed}
                    </p>
                    <p className="text-xs text-muted-foreground">Completed</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/60">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <XCircle className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {overview.aggregate.featureCounts.failed}
                    </p>
                    <p className="text-xs text-muted-foreground">Failed</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/60">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-brand-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {overview.aggregate.projectsWithAutoModeRunning}
                    </p>
                    <p className="text-xs text-muted-foreground">Auto-mode</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main content grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left column: Project cards */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">All Projects</h2>
                  {overview.aggregate.totalUnreadNotifications > 0 && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Bell className="w-4 h-4" />
                      {overview.aggregate.totalUnreadNotifications} unread notifications
                    </div>
                  )}
                </div>

                {overview.projects.length === 0 ? (
                  <Card className="bg-card/60">
                    <CardContent className="py-12 text-center">
                      <Folder className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <h3 className="font-medium text-foreground mb-1">No projects yet</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Create or open a project to get started
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Use the sidebar to create or open a project
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {overview.projects.map((project) => (
                      <ProjectStatusCard key={project.projectId} project={project} />
                    ))}
                  </div>
                )}
              </div>

              {/* Right column: Running agents and activity */}
              <div className="space-y-4">
                {/* Running agents */}
                <Card className="bg-card/60">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Bot className="w-4 h-4 text-green-500" />
                      Running Agents
                      {overview.aggregate.projectsWithAutoModeRunning > 0 && (
                        <span className="text-xs font-normal text-muted-foreground ml-auto">
                          {overview.aggregate.projectsWithAutoModeRunning} active
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <RunningAgentsPanel projects={overview.projects} />
                  </CardContent>
                </Card>

                {/* Recent activity */}
                <Card className="bg-card/60">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Activity className="w-4 h-4 text-brand-500" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <RecentActivityFeed activities={overview.recentActivity} maxItems={8} />
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Footer timestamp */}
            <div className="text-center text-xs text-muted-foreground pt-4">
              Last updated:{' '}
              {new Date(overview.generatedAt).toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <NewProjectModal
        open={showNewProjectModal}
        onOpenChange={setShowNewProjectModal}
        onCreateBlankProject={handleCreateBlankProject}
        onCreateFromTemplate={handleCreateFromTemplate}
        onCreateFromCustomUrl={handleCreateFromCustomUrl}
        isCreating={isCreating}
      />

      <WorkspacePickerModal
        open={showWorkspacePicker}
        onOpenChange={setShowWorkspacePicker}
        onSelect={handleWorkspaceSelect}
      />
    </div>
  );
}
