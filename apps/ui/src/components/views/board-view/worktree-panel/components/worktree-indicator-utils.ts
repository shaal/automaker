/**
 * Shared utility functions for worktree indicator styling and formatting.
 * These utilities ensure consistent appearance across WorktreeTab, WorktreeDropdown,
 * and WorktreeDropdownItem components.
 */

import type { PRInfo } from '../types';

/**
 * Truncates a branch name if it exceeds the maximum length.
 * @param branchName - The full branch name
 * @param maxLength - Maximum characters before truncation
 * @returns Object with truncated name and whether truncation occurred
 */
export function truncateBranchName(
  branchName: string,
  maxLength: number
): { truncated: string; isTruncated: boolean } {
  const isTruncated = branchName.length > maxLength;
  const truncated = isTruncated ? `${branchName.slice(0, maxLength)}...` : branchName;
  return { truncated, isTruncated };
}

/**
 * Returns the appropriate CSS classes for a PR badge based on PR state.
 * @param state - The PR state (OPEN, MERGED, or CLOSED)
 * @returns CSS class string for the badge
 */
export function getPRBadgeStyles(state: PRInfo['state']): string {
  switch (state) {
    case 'OPEN':
      return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
    case 'MERGED':
      return 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30';
    case 'CLOSED':
    default:
      return 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30';
  }
}

/**
 * Returns the CSS classes for the uncommitted changes badge.
 * This is a constant style used across all worktree components.
 */
export function getChangesBadgeStyles(): string {
  return 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30';
}

/** Possible test session status values */
export type TestStatus = 'pending' | 'running' | 'passed' | 'failed' | 'cancelled';

/**
 * Returns the CSS classes for a test status indicator based on test result.
 * @param status - The test session status
 * @returns CSS class string for the indicator color
 */
export function getTestStatusStyles(status: TestStatus): string {
  switch (status) {
    case 'passed':
      return 'text-green-500';
    case 'failed':
      return 'text-red-500';
    case 'running':
      return 'text-blue-500';
    case 'pending':
    case 'cancelled':
    default:
      return 'text-muted-foreground';
  }
}
