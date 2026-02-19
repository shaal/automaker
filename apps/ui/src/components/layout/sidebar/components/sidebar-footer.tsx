import { useCallback } from 'react';
import type { NavigateOptions } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import { formatShortcut } from '@/store/app-store';
import { Activity, Settings, BookOpen, MessageSquare, ExternalLink } from 'lucide-react';
import { useOSDetection } from '@/hooks/use-os-detection';
import { getElectronAPI } from '@/lib/electron';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

function getOSAbbreviation(os: string): string {
  switch (os) {
    case 'mac':
      return 'M';
    case 'windows':
      return 'W';
    case 'linux':
      return 'L';
    default:
      return '?';
  }
}

interface SidebarFooterProps {
  sidebarOpen: boolean;
  isActiveRoute: (id: string) => boolean;
  navigate: (opts: NavigateOptions) => void;
  hideRunningAgents: boolean;
  hideWiki: boolean;
  runningAgentsCount: number;
  shortcuts: {
    settings: string;
  };
}

export function SidebarFooter({
  sidebarOpen,
  isActiveRoute,
  navigate,
  hideRunningAgents,
  hideWiki,
  runningAgentsCount,
  shortcuts,
}: SidebarFooterProps) {
  const appVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0';
  const { os } = useOSDetection();
  const appMode = import.meta.env.VITE_APP_MODE || '?';
  const versionSuffix = `${getOSAbbreviation(os)}${appMode}`;

  const handleWikiClick = useCallback(() => {
    navigate({ to: '/wiki' });
  }, [navigate]);

  const handleFeedbackClick = useCallback(() => {
    try {
      const api = getElectronAPI();
      api.openExternalLink('https://github.com/AutoMaker-Org/automaker/issues');
    } catch {
      // Fallback for non-Electron environments (SSR, web browser)
      window.open('https://github.com/AutoMaker-Org/automaker/issues', '_blank');
    }
  }, []);

  // Collapsed state
  if (!sidebarOpen) {
    return (
      <div
        className={cn(
          'shrink-0 border-t border-border/40',
          'bg-gradient-to-t from-background/10 via-sidebar/50 to-transparent'
        )}
      >
        <div className="flex flex-col items-center py-2 px-2 gap-1">
          {/* Running Agents */}
          {!hideRunningAgents && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => navigate({ to: '/running-agents' })}
                  className={cn(
                    'relative flex items-center justify-center w-10 h-10 rounded-xl',
                    'transition-all duration-200 ease-out titlebar-no-drag',
                    isActiveRoute('running-agents')
                      ? [
                          'bg-gradient-to-r from-brand-500/20 via-brand-500/15 to-brand-600/10',
                          'text-foreground border border-brand-500/30',
                          'shadow-md shadow-brand-500/10',
                        ]
                      : [
                          'text-muted-foreground hover:text-foreground',
                          'hover:bg-accent/50 border border-transparent hover:border-border/40',
                        ]
                  )}
                  data-testid="running-agents-link"
                >
                  <Activity
                    className={cn(
                      'w-[18px] h-[18px]',
                      isActiveRoute('running-agents') && 'text-brand-500'
                    )}
                  />
                  {runningAgentsCount > 0 && (
                    <span
                      className={cn(
                        'absolute -top-1 -right-1 flex items-center justify-center',
                        'min-w-4 h-4 px-1 text-[9px] font-bold rounded-full',
                        'bg-brand-500 text-white shadow-sm'
                      )}
                    >
                      {runningAgentsCount > 99 ? '99' : runningAgentsCount}
                    </span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                Running Agents
                {runningAgentsCount > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 bg-brand-500 text-white rounded-full text-[10px]">
                    {runningAgentsCount}
                  </span>
                )}
              </TooltipContent>
            </Tooltip>
          )}

          {/* Settings */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => navigate({ to: '/settings' })}
                className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-xl',
                  'transition-all duration-200 ease-out titlebar-no-drag',
                  isActiveRoute('settings')
                    ? [
                        'bg-gradient-to-r from-brand-500/20 via-brand-500/15 to-brand-600/10',
                        'text-foreground border border-brand-500/30',
                        'shadow-md shadow-brand-500/10',
                      ]
                    : [
                        'text-muted-foreground hover:text-foreground',
                        'hover:bg-accent/50 border border-transparent hover:border-border/40',
                      ]
                )}
                data-testid="settings-button"
              >
                <Settings
                  className={cn('w-[18px] h-[18px]', isActiveRoute('settings') && 'text-brand-500')}
                />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              Global Settings
              <span className="ml-2 px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono text-muted-foreground">
                {formatShortcut(shortcuts.settings, true)}
              </span>
            </TooltipContent>
          </Tooltip>

          {/* Documentation */}
          {!hideWiki && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleWikiClick}
                  className={cn(
                    'flex items-center justify-center w-10 h-10 rounded-xl',
                    'text-muted-foreground hover:text-foreground',
                    'hover:bg-accent/50 border border-transparent hover:border-border/40',
                    'transition-all duration-200 ease-out titlebar-no-drag'
                  )}
                  data-testid="documentation-button"
                >
                  <BookOpen className="w-[18px] h-[18px]" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                Documentation
              </TooltipContent>
            </Tooltip>
          )}

          {/* Feedback */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleFeedbackClick}
                className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-xl',
                  'text-muted-foreground hover:text-foreground',
                  'hover:bg-accent/50 border border-transparent hover:border-border/40',
                  'transition-all duration-200 ease-out titlebar-no-drag'
                )}
                data-testid="feedback-button"
              >
                <MessageSquare className="w-[18px] h-[18px]" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              Feedback
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    );
  }

  // Expanded state
  return (
    <div
      className={cn(
        'shrink-0',
        // Top border with gradient fade
        'border-t border-border/40',
        // Elevated background for visual separation
        'bg-gradient-to-t from-background/10 via-sidebar/50 to-transparent'
      )}
    >
      {/* Running Agents Link */}
      {!hideRunningAgents && (
        <div className="px-3 py-0.5">
          <button
            onClick={() => navigate({ to: '/running-agents' })}
            className={cn(
              'group flex items-center w-full px-3 py-2 rounded-lg relative overflow-hidden titlebar-no-drag',
              'transition-all duration-200 ease-out',
              isActiveRoute('running-agents')
                ? [
                    'bg-gradient-to-r from-brand-500/20 via-brand-500/15 to-brand-600/10',
                    'text-foreground font-medium',
                    'border border-brand-500/30',
                    'shadow-sm shadow-brand-500/10',
                  ]
                : [
                    'text-muted-foreground hover:text-foreground',
                    'hover:bg-accent/50',
                    'border border-transparent hover:border-border/40',
                  ]
            )}
            data-testid="running-agents-link"
          >
            <Activity
              className={cn(
                'w-[18px] h-[18px] shrink-0 transition-all duration-200',
                isActiveRoute('running-agents')
                  ? 'text-brand-500 drop-shadow-sm'
                  : 'group-hover:text-brand-400'
              )}
            />
            <span className="ml-3 text-sm flex-1 text-left">Running Agents</span>
            {runningAgentsCount > 0 && (
              <span
                className={cn(
                  'flex items-center justify-center',
                  'min-w-5 h-5 px-1.5 text-[10px] font-bold rounded-full',
                  'bg-brand-500 text-white shadow-sm',
                  isActiveRoute('running-agents') && 'bg-brand-600'
                )}
                data-testid="running-agents-count"
              >
                {runningAgentsCount > 99 ? '99' : runningAgentsCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Settings Link */}
      <div className="px-3 py-0.5">
        <button
          onClick={() => navigate({ to: '/settings' })}
          className={cn(
            'group flex items-center w-full px-3 py-2 rounded-lg relative overflow-hidden titlebar-no-drag',
            'transition-all duration-200 ease-out',
            isActiveRoute('settings')
              ? [
                  'bg-gradient-to-r from-brand-500/20 via-brand-500/15 to-brand-600/10',
                  'text-foreground font-medium',
                  'border border-brand-500/30',
                  'shadow-sm shadow-brand-500/10',
                ]
              : [
                  'text-muted-foreground hover:text-foreground',
                  'hover:bg-accent/50',
                  'border border-transparent hover:border-border/40',
                ]
          )}
          data-testid="settings-button"
        >
          <Settings
            className={cn(
              'w-[18px] h-[18px] shrink-0 transition-all duration-200',
              isActiveRoute('settings')
                ? 'text-brand-500 drop-shadow-sm'
                : 'group-hover:text-brand-400'
            )}
          />
          <span className="ml-3 text-sm flex-1 text-left">Settings</span>
          <span
            className={cn(
              'flex items-center justify-center min-w-5 h-5 px-1.5 text-[10px] font-mono rounded transition-all duration-200',
              isActiveRoute('settings')
                ? 'bg-brand-500/20 text-brand-400'
                : 'bg-muted text-muted-foreground group-hover:bg-accent'
            )}
            data-testid="shortcut-settings"
          >
            {formatShortcut(shortcuts.settings, true)}
          </span>
        </button>
      </div>

      {/* Separator */}
      <div className="h-px bg-border/40 mx-3 my-2" />

      {/* Documentation Link */}
      {!hideWiki && (
        <div className="px-3 py-0.5">
          <button
            onClick={handleWikiClick}
            className={cn(
              'group flex items-center w-full px-3 py-1.5 rounded-md titlebar-no-drag',
              'text-muted-foreground/70 hover:text-foreground',
              'hover:bg-accent/30',
              'transition-all duration-200 ease-out'
            )}
            data-testid="documentation-button"
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            <span className="ml-2.5 text-xs">Documentation</span>
          </button>
        </div>
      )}

      {/* Feedback Link */}
      <div className="px-3 pt-0.5">
        <button
          onClick={handleFeedbackClick}
          className={cn(
            'group flex items-center w-full px-3 py-1.5 rounded-md titlebar-no-drag',
            'text-muted-foreground/70 hover:text-foreground',
            'hover:bg-accent/30',
            'transition-all duration-200 ease-out'
          )}
          data-testid="feedback-button"
        >
          <MessageSquare className="w-4 h-4 shrink-0" />
          <span className="ml-2.5 text-xs">Feedback</span>
          <ExternalLink className="w-3 h-3 ml-auto text-muted-foreground/50" />
        </button>
      </div>

      {/* Version */}
      <div className="px-6 py-1.5 text-center">
        <span className="text-[9px] text-muted-foreground/40">
          v{appVersion} {versionSuffix}
        </span>
      </div>
    </div>
  );
}
