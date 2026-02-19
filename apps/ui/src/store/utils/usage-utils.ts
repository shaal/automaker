import type { ClaudeUsage } from '../types/usage-types';

/**
 * Check if Claude usage is at its limit (any of: session >= 100%, weekly >= 100%, OR cost >= limit)
 * Returns true if any limit is reached, meaning auto mode should pause feature pickup.
 */
export function isClaudeUsageAtLimit(claudeUsage: ClaudeUsage | null): boolean {
  if (!claudeUsage) {
    // No usage data available - don't block
    return false;
  }

  // Check session limit (5-hour window)
  if (claudeUsage.sessionPercentage >= 100) {
    return true;
  }

  // Check weekly limit
  if (claudeUsage.weeklyPercentage >= 100) {
    return true;
  }

  // Check cost limit (if configured)
  if (
    claudeUsage.costLimit !== null &&
    claudeUsage.costLimit > 0 &&
    claudeUsage.costUsed !== null &&
    claudeUsage.costUsed >= claudeUsage.costLimit
  ) {
    return true;
  }

  return false;
}
