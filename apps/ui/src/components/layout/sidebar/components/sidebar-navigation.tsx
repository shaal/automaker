import { useCallback, useEffect, useRef } from 'react';
import type { NavigateOptions } from '@tanstack/react-router';
import { ChevronDown, Wrench, Github, Folder } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn, isMac } from '@/lib/utils';
import { isElectron } from '@/lib/electron';
import { MACOS_ELECTRON_TOP_PADDING_CLASS } from '../constants';
import { formatShortcut, useAppStore } from '@/store/app-store';
import { getAuthenticatedImageUrl } from '@/lib/api-fetch';
import type { NavSection } from '../types';
import type { Project } from '@/lib/electron';
import type { SidebarStyle } from '@automaker/types';
import { Spinner } from '@/components/ui/spinner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// Map section labels to icons
const sectionIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  Tools: Wrench,
  GitHub: Github,
};

interface SidebarNavigationProps {
  currentProject: Project | null;
  sidebarOpen: boolean;
  sidebarStyle: SidebarStyle;
  navSections: NavSection[];
  isActiveRoute: (id: string) => boolean;
  navigate: (opts: NavigateOptions) => void;
  onScrollStateChange?: (canScrollDown: boolean) => void;
}

export function SidebarNavigation({
  currentProject,
  sidebarOpen,
  sidebarStyle,
  navSections,
  isActiveRoute,
  navigate,
  onScrollStateChange,
}: SidebarNavigationProps) {
  const navRef = useRef<HTMLElement>(null);

  // Get collapsed state from store (persisted across restarts)
  const { collapsedNavSections, setCollapsedNavSections, toggleNavSection } = useAppStore();

  // Initialize collapsed state when sections change (e.g., GitHub section appears)
  // Only set defaults for sections that don't have a persisted state
  useEffect(() => {
    let hasNewSections = false;
    const updated = { ...collapsedNavSections };

    navSections.forEach((section) => {
      if (section.collapsible && section.label && !(section.label in updated)) {
        updated[section.label] = section.defaultCollapsed ?? false;
        hasNewSections = true;
      }
    });

    if (hasNewSections) {
      setCollapsedNavSections(updated);
    }
  }, [navSections, collapsedNavSections, setCollapsedNavSections]);

  // Check scroll state
  const checkScrollState = useCallback(() => {
    if (!navRef.current || !onScrollStateChange) return;
    const { scrollTop, scrollHeight, clientHeight } = navRef.current;
    const canScrollDown = scrollTop + clientHeight < scrollHeight - 10;
    onScrollStateChange(canScrollDown);
  }, [onScrollStateChange]);

  // Monitor scroll state
  useEffect(() => {
    checkScrollState();
    const nav = navRef.current;
    if (!nav) return;

    nav.addEventListener('scroll', checkScrollState);
    const resizeObserver = new ResizeObserver(checkScrollState);
    resizeObserver.observe(nav);

    return () => {
      nav.removeEventListener('scroll', checkScrollState);
      resizeObserver.disconnect();
    };
  }, [checkScrollState, collapsedNavSections]);

  // Filter sections: always show non-project sections, only show project sections when project exists
  const visibleSections = navSections.filter((section) => {
    // Always show Dashboard (first section with no label)
    if (!section.label && section.items.some((item) => item.id === 'overview')) {
      return true;
    }
    // Show other sections only when project is selected
    return !!currentProject;
  });

  // Get the icon component for the current project
  const getProjectIcon = (): LucideIcon => {
    if (currentProject?.icon && currentProject.icon in LucideIcons) {
      return (LucideIcons as unknown as Record<string, LucideIcon>)[currentProject.icon];
    }
    return Folder;
  };

  const ProjectIcon = getProjectIcon();
  const hasCustomIcon = !!currentProject?.customIconPath;

  return (
    <nav
      ref={navRef}
      className={cn(
        'flex-1 overflow-y-auto scrollbar-hide px-3 pb-2',
        // Add top padding in discord mode since there's no header
        // Extra padding for macOS Electron to avoid traffic light overlap
        sidebarStyle === 'discord'
          ? isMac && isElectron()
            ? MACOS_ELECTRON_TOP_PADDING_CLASS
            : 'pt-3'
          : 'mt-1'
      )}
    >
      {/* Project name display for classic/discord mode */}
      {sidebarStyle === 'discord' && currentProject && sidebarOpen && (
        <div className="mb-3">
          <div className="flex items-center gap-2.5 px-3 py-2">
            {hasCustomIcon ? (
              <img
                src={getAuthenticatedImageUrl(currentProject.customIconPath!, currentProject.path)}
                alt={currentProject.name}
                className="w-5 h-5 rounded object-cover"
              />
            ) : (
              <ProjectIcon className="w-5 h-5 text-brand-500 shrink-0" />
            )}
            <span className="text-sm font-medium text-foreground truncate">
              {currentProject.name}
            </span>
          </div>
          <div className="h-px bg-border/40 mx-1 mt-1" />
        </div>
      )}

      {/* Navigation sections */}
      {visibleSections.map((section, sectionIdx) => {
        const isCollapsed = section.label ? collapsedNavSections[section.label] : false;
        const isCollapsible = section.collapsible && section.label && sidebarOpen;

        const SectionIcon = section.label ? sectionIcons[section.label] : null;

        return (
          <div key={sectionIdx} className={sectionIdx > 0 && sidebarOpen ? 'mt-4' : ''}>
            {/* Section Label - clickable if collapsible (expanded sidebar) */}
            {section.label && sidebarOpen && (
              <button
                onClick={() => isCollapsible && toggleNavSection(section.label!)}
                className={cn(
                  'group flex items-center w-full px-3 py-1.5 mb-1 rounded-md',
                  'transition-all duration-200 ease-out',
                  isCollapsible
                    ? [
                        'cursor-pointer',
                        'hover:bg-accent/50 hover:text-foreground',
                        'border border-transparent hover:border-border/40',
                      ]
                    : 'cursor-default'
                )}
                disabled={!isCollapsible}
              >
                <span
                  className={cn(
                    'text-[10px] font-semibold uppercase tracking-widest transition-colors duration-200',
                    isCollapsible
                      ? 'text-muted-foreground/70 group-hover:text-foreground'
                      : 'text-muted-foreground/70'
                  )}
                >
                  {section.label}
                </span>
                {isCollapsible && (
                  <ChevronDown
                    className={cn(
                      'w-3 h-3 ml-auto transition-all duration-200',
                      isCollapsed
                        ? '-rotate-90 text-muted-foreground/50 group-hover:text-muted-foreground'
                        : 'text-muted-foreground/50 group-hover:text-muted-foreground'
                    )}
                  />
                )}
              </button>
            )}

            {/* Section icon with dropdown (collapsed sidebar) */}
            {section.label && !sidebarOpen && SectionIcon && section.collapsible && isCollapsed && (
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <button
                        className={cn(
                          'group flex items-center justify-center w-full py-2 rounded-lg',
                          'text-muted-foreground hover:text-foreground',
                          'hover:bg-accent/50 border border-transparent hover:border-border/40',
                          'transition-all duration-200 ease-out'
                        )}
                      >
                        <SectionIcon className="w-[18px] h-[18px]" />
                      </button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>
                    {section.label}
                  </TooltipContent>
                </Tooltip>
                <DropdownMenuContent side="right" align="start" sideOffset={8} className="w-48">
                  {section.items.map((item) => {
                    const ItemIcon = item.icon;
                    return (
                      <DropdownMenuItem
                        key={item.id}
                        onClick={() => navigate({ to: `/${item.id}` as unknown as '/' })}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <ItemIcon className="w-4 h-4" />
                        <span>{item.label}</span>
                        {item.shortcut && (
                          <span className="ml-auto text-[10px] font-mono text-muted-foreground">
                            {formatShortcut(item.shortcut, true)}
                          </span>
                        )}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Separator for sections without label (visual separation) */}
            {!section.label && sectionIdx > 0 && sidebarOpen && (
              <div className="h-px bg-border/40 mx-3 mb-3"></div>
            )}
            {(section.label || sectionIdx > 0) && !sidebarOpen && (
              <div className="h-px bg-border/30 mx-2 my-1.5"></div>
            )}

            {/* Nav Items - show when section is expanded, or when sidebar is collapsed and section doesn't use dropdown */}
            {!isCollapsed && (
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = isActiveRoute(item.id);
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        // Cast to the router's path type; item.id is constrained to known routes
                        navigate({ to: `/${item.id}` as unknown as '/' });
                      }}
                      className={cn(
                        'group flex items-center w-full px-3 py-2 rounded-lg relative overflow-hidden titlebar-no-drag',
                        'transition-all duration-200 ease-out',
                        isActive
                          ? [
                              // Active: Premium gradient with glow
                              'bg-gradient-to-r from-brand-500/20 via-brand-500/15 to-brand-600/10',
                              'text-foreground font-medium',
                              'border border-brand-500/30',
                              'shadow-sm shadow-brand-500/10',
                            ]
                          : [
                              // Inactive: Subtle hover state
                              'text-muted-foreground hover:text-foreground',
                              'hover:bg-accent/50',
                              'border border-transparent hover:border-border/40',
                            ],
                        sidebarOpen ? 'justify-start' : 'justify-center'
                      )}
                      title={!sidebarOpen ? item.label : undefined}
                      data-testid={`nav-${item.id}`}
                    >
                      <div className="relative">
                        {item.isLoading ? (
                          <Spinner
                            size="sm"
                            className={cn(
                              'shrink-0',
                              isActive ? 'text-brand-500' : 'text-muted-foreground'
                            )}
                          />
                        ) : (
                          <Icon
                            className={cn(
                              'w-[18px] h-[18px] shrink-0 transition-all duration-200',
                              isActive
                                ? 'text-brand-500 drop-shadow-sm'
                                : 'group-hover:text-brand-400'
                            )}
                          />
                        )}
                        {/* Count badge for collapsed state */}
                        {!sidebarOpen && item.count !== undefined && item.count > 0 && (
                          <span
                            className={cn(
                              'absolute -top-1.5 -right-1.5 flex items-center justify-center',
                              'min-w-4 h-4 px-0.5 text-[9px] font-bold rounded-full',
                              'bg-primary text-primary-foreground shadow-sm',
                              'animate-in fade-in zoom-in duration-200'
                            )}
                          >
                            {item.count > 99 ? '99' : item.count}
                          </span>
                        )}
                      </div>
                      <span
                        className={cn(
                          'ml-3 text-sm flex-1 text-left',
                          sidebarOpen ? 'block' : 'hidden'
                        )}
                      >
                        {item.label}
                      </span>
                      {/* Count badge */}
                      {item.count !== undefined && item.count > 0 && sidebarOpen && (
                        <span
                          className={cn(
                            'flex items-center justify-center',
                            'min-w-5 h-5 px-1.5 text-[10px] font-bold rounded-full',
                            'bg-primary text-primary-foreground shadow-sm',
                            'animate-in fade-in zoom-in duration-200'
                          )}
                          data-testid={`count-${item.id}`}
                        >
                          {item.count > 99 ? '99+' : item.count}
                        </span>
                      )}
                      {item.shortcut && sidebarOpen && !item.count && (
                        <span
                          className={cn(
                            'flex items-center justify-center min-w-5 h-5 px-1.5 text-[10px] font-mono rounded transition-all duration-200',
                            isActive
                              ? 'bg-brand-500/20 text-brand-400'
                              : 'bg-muted text-muted-foreground group-hover:bg-accent'
                          )}
                          data-testid={`shortcut-${item.id}`}
                        >
                          {formatShortcut(item.shortcut, true)}
                        </span>
                      )}
                      {/* Tooltip for collapsed state */}
                      {!sidebarOpen && (
                        <span
                          className={cn(
                            'absolute left-full ml-3 px-2.5 py-1.5 rounded-md',
                            'bg-popover text-popover-foreground text-sm',
                            'border border-border shadow-lg',
                            'opacity-0 group-hover:opacity-100',
                            'transition-all duration-200 whitespace-nowrap z-50',
                            'translate-x-1 group-hover:translate-x-0'
                          )}
                          data-testid={`sidebar-tooltip-${item.label.toLowerCase()}`}
                        >
                          {item.label}
                          {item.shortcut && (
                            <span className="ml-2 px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono text-muted-foreground">
                              {formatShortcut(item.shortcut, true)}
                            </span>
                          )}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Placeholder when no project is selected */}
      {!currentProject && sidebarOpen && (
        <div className="flex items-center justify-center px-4 py-8">
          <p className="text-muted-foreground text-xs text-center">
            Select or create a project to continue
          </p>
        </div>
      )}
    </nav>
  );
}
