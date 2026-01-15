import { Folder, LucideIcon } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { cn, isMac } from '@/lib/utils';
import { getAuthenticatedImageUrl } from '@/lib/api-fetch';
import { isElectron, type Project } from '@/lib/electron';

interface SidebarHeaderProps {
  sidebarOpen: boolean;
  currentProject: Project | null;
}

export function SidebarHeader({ sidebarOpen, currentProject }: SidebarHeaderProps) {
  // Get the icon component from lucide-react
  const getIconComponent = (): LucideIcon => {
    if (currentProject?.icon && currentProject.icon in LucideIcons) {
      return (LucideIcons as Record<string, LucideIcon>)[currentProject.icon];
    }
    return Folder;
  };

  const IconComponent = getIconComponent();
  const hasCustomIcon = !!currentProject?.customIconPath;

  return (
    <div
      className={cn(
        'shrink-0 flex flex-col',
        // Add padding on macOS Electron for traffic light buttons
        isMac && isElectron() && 'pt-[10px]'
      )}
    >
      {/* Project name and icon display */}
      {currentProject && (
        <div
          className={cn(
            'flex items-center gap-3 px-4 pt-3 pb-1',
            !sidebarOpen && 'justify-center px-2'
          )}
        >
          {/* Project Icon */}
          <div className="shrink-0">
            {hasCustomIcon ? (
              <img
                src={getAuthenticatedImageUrl(currentProject.customIconPath!, currentProject.path)}
                alt={currentProject.name}
                className="w-8 h-8 rounded-lg object-cover ring-1 ring-border/50"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
                <IconComponent className="w-5 h-5 text-brand-500" />
              </div>
            )}
          </div>

          {/* Project Name - only show when sidebar is open */}
          {sidebarOpen && (
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-foreground truncate">
                {currentProject.name}
              </h2>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
