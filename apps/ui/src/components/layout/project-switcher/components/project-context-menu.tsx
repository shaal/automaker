import { useEffect, useRef, useState, memo } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Edit2, Trash2, Palette, ChevronRight, Moon, Sun, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type ThemeMode, useAppStore } from '@/store/app-store';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import type { Project } from '@/lib/electron';
import { PROJECT_DARK_THEMES, PROJECT_LIGHT_THEMES } from '@/components/layout/sidebar/constants';
import { useThemePreview } from '@/components/layout/sidebar/hooks';

// Constants for z-index values
const Z_INDEX = {
  CONTEXT_MENU: 100,
  THEME_SUBMENU: 101,
} as const;

// Theme option type - using ThemeMode for type safety
interface ThemeOption {
  value: ThemeMode;
  label: string;
  icon: LucideIcon;
  color: string;
}

// Reusable theme button component to avoid duplication (DRY principle)
interface ThemeButtonProps {
  option: ThemeOption;
  isSelected: boolean;
  onPointerEnter: () => void;
  onPointerLeave: (e: React.PointerEvent) => void;
  onClick: () => void;
}

const ThemeButton = memo(function ThemeButton({
  option,
  isSelected,
  onPointerEnter,
  onPointerLeave,
  onClick,
}: ThemeButtonProps) {
  const Icon = option.icon;
  return (
    <button
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md',
        'text-xs text-left',
        'hover:bg-accent transition-colors',
        'focus:outline-none focus:bg-accent',
        isSelected && 'bg-accent'
      )}
      data-testid={`project-theme-${option.value}`}
    >
      <Icon className="w-3.5 h-3.5" style={{ color: option.color }} />
      <span>{option.label}</span>
    </button>
  );
});

// Reusable theme column component
interface ThemeColumnProps {
  title: string;
  icon: LucideIcon;
  themes: ThemeOption[];
  selectedTheme: ThemeMode | null;
  onPreviewEnter: (value: ThemeMode) => void;
  onPreviewLeave: (e: React.PointerEvent) => void;
  onSelect: (value: ThemeMode) => void;
}

const ThemeColumn = memo(function ThemeColumn({
  title,
  icon: Icon,
  themes,
  selectedTheme,
  onPreviewEnter,
  onPreviewLeave,
  onSelect,
}: ThemeColumnProps) {
  return (
    <div className="flex-1">
      <div className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="w-3 h-3" />
        {title}
      </div>
      <div className="space-y-0.5">
        {themes.map((option) => (
          <ThemeButton
            key={option.value}
            option={option}
            isSelected={selectedTheme === option.value}
            onPointerEnter={() => onPreviewEnter(option.value)}
            onPointerLeave={onPreviewLeave}
            onClick={() => onSelect(option.value)}
          />
        ))}
      </div>
    </div>
  );
});

interface ProjectContextMenuProps {
  project: Project;
  position: { x: number; y: number };
  onClose: () => void;
  onEdit: (project: Project) => void;
}

export function ProjectContextMenu({
  project,
  position,
  onClose,
  onEdit,
}: ProjectContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const {
    moveProjectToTrash,
    theme: globalTheme,
    setTheme,
    setProjectTheme,
    setPreviewTheme,
  } = useAppStore();
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [showThemeSubmenu, setShowThemeSubmenu] = useState(false);
  const themeSubmenuRef = useRef<HTMLDivElement>(null);

  const { handlePreviewEnter, handlePreviewLeave } = useThemePreview({ setPreviewTheme });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setPreviewTheme(null);
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPreviewTheme(null);
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose, setPreviewTheme]);

  const handleEdit = () => {
    onEdit(project);
  };

  const handleRemove = () => {
    setShowRemoveDialog(true);
  };

  const handleThemeSelect = (value: ThemeMode | '') => {
    setPreviewTheme(null);
    if (value !== '') {
      setTheme(value);
    } else {
      setTheme(globalTheme);
    }
    setProjectTheme(project.id, value === '' ? null : value);
    setShowThemeSubmenu(false);
  };

  const handleConfirmRemove = () => {
    moveProjectToTrash(project.id);
    onClose();
  };

  return (
    <>
      <div
        ref={menuRef}
        className={cn(
          'fixed min-w-48 rounded-lg',
          'bg-popover text-popover-foreground',
          'border border-border shadow-lg',
          'animate-in fade-in zoom-in-95 duration-100'
        )}
        style={{
          top: position.y,
          left: position.x,
          zIndex: Z_INDEX.CONTEXT_MENU,
        }}
        data-testid="project-context-menu"
      >
        <div className="p-1">
          <button
            onClick={handleEdit}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 rounded-md',
              'text-sm font-medium text-left',
              'hover:bg-accent transition-colors',
              'focus:outline-none focus:bg-accent'
            )}
            data-testid="edit-project-button"
          >
            <Edit2 className="w-4 h-4" />
            <span>Edit Name & Icon</span>
          </button>

          {/* Theme Submenu Trigger */}
          <div
            className="relative"
            onMouseEnter={() => setShowThemeSubmenu(true)}
            onMouseLeave={() => {
              setShowThemeSubmenu(false);
              setPreviewTheme(null);
            }}
          >
            <button
              onClick={() => setShowThemeSubmenu(!showThemeSubmenu)}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 rounded-md',
                'text-sm font-medium text-left',
                'hover:bg-accent transition-colors',
                'focus:outline-none focus:bg-accent'
              )}
              data-testid="theme-project-button"
            >
              <Palette className="w-4 h-4" />
              <span className="flex-1">Project Theme</span>
              {project.theme && (
                <span className="text-[10px] text-muted-foreground capitalize">
                  {project.theme}
                </span>
              )}
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>

            {/* Theme Submenu */}
            {showThemeSubmenu && (
              <div
                ref={themeSubmenuRef}
                className={cn(
                  'absolute left-full top-0 ml-1 min-w-[420px] rounded-lg',
                  'bg-popover text-popover-foreground',
                  'border border-border shadow-lg',
                  'animate-in fade-in zoom-in-95 duration-100'
                )}
                style={{ zIndex: Z_INDEX.THEME_SUBMENU }}
                data-testid="project-theme-submenu"
              >
                <div className="p-2">
                  {/* Use Global Option */}
                  <button
                    onPointerEnter={() => handlePreviewEnter(globalTheme)}
                    onPointerLeave={handlePreviewLeave}
                    onClick={() => handleThemeSelect('')}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 rounded-md',
                      'text-sm font-medium text-left',
                      'hover:bg-accent transition-colors',
                      'focus:outline-none focus:bg-accent',
                      !project.theme && 'bg-accent'
                    )}
                    data-testid="project-theme-global"
                  >
                    <Monitor className="w-4 h-4" />
                    <span>Use Global</span>
                    <span className="text-[10px] text-muted-foreground ml-1 capitalize">
                      ({globalTheme})
                    </span>
                  </button>

                  <div className="h-px bg-border my-2" />

                  {/* Two Column Layout - Using reusable ThemeColumn component */}
                  <div className="flex gap-2">
                    <ThemeColumn
                      title="Dark"
                      icon={Moon}
                      themes={PROJECT_DARK_THEMES as ThemeOption[]}
                      selectedTheme={project.theme as ThemeMode | null}
                      onPreviewEnter={handlePreviewEnter}
                      onPreviewLeave={handlePreviewLeave}
                      onSelect={handleThemeSelect}
                    />
                    <ThemeColumn
                      title="Light"
                      icon={Sun}
                      themes={PROJECT_LIGHT_THEMES as ThemeOption[]}
                      selectedTheme={project.theme as ThemeMode | null}
                      onPreviewEnter={handlePreviewEnter}
                      onPreviewLeave={handlePreviewLeave}
                      onSelect={handleThemeSelect}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleRemove}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 rounded-md',
              'text-sm font-medium text-left',
              'text-destructive hover:bg-destructive/10',
              'transition-colors',
              'focus:outline-none focus:bg-destructive/10'
            )}
            data-testid="remove-project-button"
          >
            <Trash2 className="w-4 h-4" />
            <span>Remove Project</span>
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={showRemoveDialog}
        onOpenChange={setShowRemoveDialog}
        onConfirm={handleConfirmRemove}
        title="Remove Project"
        description={`Are you sure you want to remove "${project.name}" from the project list? This won't delete any files on disk.`}
        icon={Trash2}
        iconClassName="text-destructive"
        confirmText="Remove"
        confirmVariant="destructive"
      />
    </>
  );
}
