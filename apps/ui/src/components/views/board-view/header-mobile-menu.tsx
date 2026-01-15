import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Menu, Bot, Wand2, Settings2, GitBranch, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MobileUsageBar } from './mobile-usage-bar';

interface HeaderMobileMenuProps {
  // Worktree panel visibility
  isWorktreePanelVisible: boolean;
  onWorktreePanelToggle: (visible: boolean) => void;
  // Concurrency control
  maxConcurrency: number;
  runningAgentsCount: number;
  onConcurrencyChange: (value: number) => void;
  // Auto mode
  isAutoModeRunning: boolean;
  onAutoModeToggle: (enabled: boolean) => void;
  onOpenAutoModeSettings: () => void;
  // Plan button
  onOpenPlanDialog: () => void;
  // Usage bar visibility
  showClaudeUsage: boolean;
  showCodexUsage: boolean;
}

export function HeaderMobileMenu({
  isWorktreePanelVisible,
  onWorktreePanelToggle,
  maxConcurrency,
  runningAgentsCount,
  onConcurrencyChange,
  isAutoModeRunning,
  onAutoModeToggle,
  onOpenAutoModeSettings,
  onOpenPlanDialog,
  showClaudeUsage,
  showCodexUsage,
}: HeaderMobileMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          data-testid="header-mobile-menu-trigger"
        >
          <Menu className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {/* Usage Bar - show if either provider is authenticated */}
        {(showClaudeUsage || showCodexUsage) && (
          <>
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              Usage
            </DropdownMenuLabel>
            <MobileUsageBar showClaudeUsage={showClaudeUsage} showCodexUsage={showCodexUsage} />
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Controls
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Auto Mode Toggle */}
        <div
          className="flex items-center justify-between px-2 py-2 cursor-pointer hover:bg-accent rounded-sm"
          onClick={() => onAutoModeToggle(!isAutoModeRunning)}
          data-testid="mobile-auto-mode-toggle-container"
        >
          <div className="flex items-center gap-2">
            <Zap
              className={cn(
                'w-4 h-4',
                isAutoModeRunning ? 'text-yellow-500' : 'text-muted-foreground'
              )}
            />
            <span className="text-sm font-medium">Auto Mode</span>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="mobile-auto-mode-toggle"
              checked={isAutoModeRunning}
              onCheckedChange={onAutoModeToggle}
              onClick={(e) => e.stopPropagation()}
              data-testid="mobile-auto-mode-toggle"
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenAutoModeSettings();
              }}
              className="p-1 rounded hover:bg-accent/50 transition-colors"
              title="Auto Mode Settings"
              data-testid="mobile-auto-mode-settings-button"
            >
              <Settings2 className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* Worktrees Toggle */}
        <div
          className="flex items-center justify-between px-2 py-2 cursor-pointer hover:bg-accent rounded-sm"
          onClick={() => onWorktreePanelToggle(!isWorktreePanelVisible)}
          data-testid="mobile-worktrees-toggle-container"
        >
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Worktrees</span>
          </div>
          <Switch
            id="mobile-worktrees-toggle"
            checked={isWorktreePanelVisible}
            onCheckedChange={onWorktreePanelToggle}
            onClick={(e) => e.stopPropagation()}
            data-testid="mobile-worktrees-toggle"
          />
        </div>

        <DropdownMenuSeparator />

        {/* Concurrency Control */}
        <div className="px-2 py-2" data-testid="mobile-concurrency-control">
          <div className="flex items-center gap-2 mb-2">
            <Bot className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Max Agents</span>
            <span
              className="text-sm text-muted-foreground ml-auto"
              data-testid="mobile-concurrency-value"
            >
              {runningAgentsCount}/{maxConcurrency}
            </span>
          </div>
          <Slider
            value={[maxConcurrency]}
            onValueChange={(value) => onConcurrencyChange(value[0])}
            min={1}
            max={10}
            step={1}
            className="w-full"
            data-testid="mobile-concurrency-slider"
          />
        </div>

        <DropdownMenuSeparator />

        {/* Plan Button */}
        <DropdownMenuItem
          onClick={onOpenPlanDialog}
          className="flex items-center gap-2"
          data-testid="mobile-plan-button"
        >
          <Wand2 className="w-4 h-4" />
          <span>Plan</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
