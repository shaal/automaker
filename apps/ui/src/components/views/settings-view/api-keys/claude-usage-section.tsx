import { useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { getElectronAPI } from '@/lib/electron';
import { useSetupStore } from '@/store/setup-store';
import { useAppStore } from '@/store/app-store';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle } from 'lucide-react';

const ERROR_NO_API = 'Claude usage API not available';
const CLAUDE_USAGE_TITLE = 'Claude Usage';
const CLAUDE_USAGE_SUBTITLE = 'Shows usage limits reported by the Claude CLI.';
const CLAUDE_AUTH_WARNING = 'Authenticate Claude CLI to view usage limits.';
const CLAUDE_LOGIN_COMMAND = 'claude login';
const CLAUDE_NO_USAGE_MESSAGE =
  'Usage limits are not available yet. Try refreshing if this persists.';
const UPDATED_LABEL = 'Updated';
const CLAUDE_FETCH_ERROR = 'Failed to fetch usage';
const CLAUDE_REFRESH_LABEL = 'Refresh Claude usage';
const WARNING_THRESHOLD = 75;
const CAUTION_THRESHOLD = 50;
const MAX_PERCENTAGE = 100;
const REFRESH_INTERVAL_MS = 60_000;
const STALE_THRESHOLD_MS = 2 * 60_000;
// Using purple/indigo for Claude branding
const USAGE_COLOR_CRITICAL = 'bg-red-500';
const USAGE_COLOR_WARNING = 'bg-amber-500';
const USAGE_COLOR_OK = 'bg-indigo-500';

/**
 * Get the appropriate color class for a usage percentage
 */
function getUsageColor(percentage: number): string {
  if (percentage >= WARNING_THRESHOLD) {
    return USAGE_COLOR_CRITICAL;
  }
  if (percentage >= CAUTION_THRESHOLD) {
    return USAGE_COLOR_WARNING;
  }
  return USAGE_COLOR_OK;
}

/**
 * Individual usage card displaying a usage metric with progress bar
 */
function UsageCard({
  title,
  subtitle,
  percentage,
  resetText,
}: {
  title: string;
  subtitle: string;
  percentage: number;
  resetText?: string;
}) {
  const safePercentage = Math.min(Math.max(percentage, 0), MAX_PERCENTAGE);

  return (
    <div className="rounded-xl border border-border/60 bg-card/50 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <span className="text-sm font-semibold text-foreground">{Math.round(safePercentage)}%</span>
      </div>
      <div className="mt-3 h-2 w-full rounded-full bg-secondary/60">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            getUsageColor(safePercentage)
          )}
          style={{ width: `${safePercentage}%` }}
        />
      </div>
      {resetText && <p className="mt-2 text-xs text-muted-foreground">{resetText}</p>}
    </div>
  );
}

export function ClaudeUsageSection() {
  const claudeAuthStatus = useSetupStore((state) => state.claudeAuthStatus);
  const { claudeUsage, claudeUsageLastUpdated, setClaudeUsage } = useAppStore();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const canFetchUsage = !!claudeAuthStatus?.authenticated;
  // If we have usage data, we can show it even if auth status is unsure
  const hasUsage = !!claudeUsage;

  const lastUpdatedLabel = claudeUsageLastUpdated
    ? new Date(claudeUsageLastUpdated).toLocaleString()
    : null;

  const showAuthWarning =
    (!canFetchUsage && !hasUsage && !isLoading) ||
    (error && error.includes('Authentication required'));

  const isStale =
    !claudeUsageLastUpdated || Date.now() - claudeUsageLastUpdated > STALE_THRESHOLD_MS;

  const fetchUsage = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const api = getElectronAPI();
      if (!api.claude) {
        setError(ERROR_NO_API);
        return;
      }
      const result = await api.claude.getUsage();

      if ('error' in result) {
        // Check for auth errors specifically
        if (
          result.message?.includes('Authentication required') ||
          result.error?.includes('Authentication required')
        ) {
          // We'll show the auth warning UI instead of a generic error
        } else {
          setError(result.message || result.error);
        }
        return;
      }

      setClaudeUsage(result);
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : CLAUDE_FETCH_ERROR;
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [setClaudeUsage]);

  useEffect(() => {
    // Initial fetch if authenticated and stale
    // Compute staleness inside effect to avoid re-running when Date.now() changes
    const isDataStale =
      !claudeUsageLastUpdated || Date.now() - claudeUsageLastUpdated > STALE_THRESHOLD_MS;
    if (canFetchUsage && isDataStale) {
      void fetchUsage();
    }
  }, [fetchUsage, canFetchUsage, claudeUsageLastUpdated]);

  useEffect(() => {
    if (!canFetchUsage) return undefined;

    const intervalId = setInterval(() => {
      void fetchUsage();
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [fetchUsage, canFetchUsage]);

  return (
    <div
      className={cn(
        'rounded-2xl overflow-hidden',
        'border border-border/50',
        'bg-gradient-to-br from-card/90 via-card/70 to-card/80 backdrop-blur-xl',
        'shadow-sm shadow-black/5'
      )}
    >
      <div className="p-6 border-b border-border/50 bg-gradient-to-r from-transparent via-accent/5 to-transparent">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-indigo-600/10 flex items-center justify-center border border-indigo-500/20">
            <div className="w-5 h-5 rounded-full bg-indigo-500/50" />
          </div>
          <h2 className="text-lg font-semibold text-foreground tracking-tight">
            {CLAUDE_USAGE_TITLE}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchUsage}
            disabled={isLoading}
            className="ml-auto h-9 w-9 rounded-lg hover:bg-accent/50"
            data-testid="refresh-claude-usage"
            title={CLAUDE_REFRESH_LABEL}
          >
            <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground/80 ml-12">{CLAUDE_USAGE_SUBTITLE}</p>
      </div>

      <div className="p-6 space-y-4">
        {showAuthWarning && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
            <div className="text-sm text-amber-400">
              {CLAUDE_AUTH_WARNING} Run <span className="font-mono">{CLAUDE_LOGIN_COMMAND}</span>.
            </div>
          </div>
        )}

        {error && !showAuthWarning && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
            <div className="text-sm text-red-400">{error}</div>
          </div>
        )}

        {hasUsage && (
          <div className="grid gap-3 sm:grid-cols-2">
            <UsageCard
              title="Session Limit"
              subtitle="5-hour rolling window"
              percentage={claudeUsage.sessionPercentage}
              resetText={claudeUsage.sessionResetText}
            />

            <UsageCard
              title="Weekly Limit"
              subtitle="Resets every Thursday"
              percentage={claudeUsage.weeklyPercentage}
              resetText={claudeUsage.weeklyResetText}
            />
          </div>
        )}

        {!hasUsage && !error && !showAuthWarning && !isLoading && (
          <div className="rounded-xl border border-border/60 bg-secondary/20 p-4 text-xs text-muted-foreground">
            {CLAUDE_NO_USAGE_MESSAGE}
          </div>
        )}

        {lastUpdatedLabel && (
          <div className="text-[10px] text-muted-foreground text-right">
            {UPDATED_LABEL} {lastUpdatedLabel}
          </div>
        )}
      </div>
    </div>
  );
}
