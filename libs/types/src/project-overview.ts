/**
 * Project Overview Types - Multi-project dashboard data structures
 *
 * Defines types for aggregating and displaying status across multiple projects,
 * including individual project health, aggregate metrics, and recent activity feeds.
 * Used by the multi-project overview dashboard for at-a-glance monitoring.
 */

// ============================================================================
// Project Status Types
// ============================================================================

/**
 * ProjectHealthStatus - Overall health indicator for a project
 *
 * Represents the computed health state based on feature statuses:
 * - idle: No active work, all features are pending or completed
 * - active: Features are currently running or in progress
 * - waiting: Features are waiting for user approval or input
 * - error: One or more features have failed
 * - completed: All features have been completed successfully
 */
export type ProjectHealthStatus = 'idle' | 'active' | 'waiting' | 'error' | 'completed';

/**
 * FeatureStatusCounts - Breakdown of features by status
 *
 * Provides counts for each feature status to show progress at a glance.
 */
export interface FeatureStatusCounts {
  /** Number of features waiting to be started */
  pending: number;
  /** Number of features currently executing */
  running: number;
  /** Number of features that completed successfully */
  completed: number;
  /** Number of features that encountered errors */
  failed: number;
  /** Number of features that passed verification */
  verified: number;
}

/**
 * ProjectStatus - Status summary for an individual project
 *
 * Contains all information needed to display a project's current state
 * in the multi-project overview dashboard.
 */
export interface ProjectStatus {
  /** Project unique identifier (matches ProjectRef.id) */
  projectId: string;
  /** Project display name */
  projectName: string;
  /** Absolute filesystem path to project */
  projectPath: string;
  /** Computed overall health status */
  healthStatus: ProjectHealthStatus;
  /** Breakdown of features by status */
  featureCounts: FeatureStatusCounts;
  /** Total number of features in the project */
  totalFeatures: number;
  /** ISO timestamp of last activity in this project */
  lastActivityAt?: string;
  /** Whether auto-mode is currently running */
  isAutoModeRunning: boolean;
  /** Name of the currently active branch (if in a worktree) */
  activeBranch?: string;
  /** Number of unread notifications for this project */
  unreadNotificationCount: number;
  /** Extensibility for future properties */
  [key: string]: unknown;
}

// ============================================================================
// Aggregate Status Types
// ============================================================================

/**
 * AggregateFeatureCounts - Total feature counts across all projects
 */
export interface AggregateFeatureCounts {
  /** Total features across all projects */
  total: number;
  /** Total pending features */
  pending: number;
  /** Total running features */
  running: number;
  /** Total completed features */
  completed: number;
  /** Total failed features */
  failed: number;
  /** Total verified features */
  verified: number;
}

/**
 * AggregateProjectCounts - Project counts by health status
 */
export interface AggregateProjectCounts {
  /** Total number of projects */
  total: number;
  /** Projects with active work */
  active: number;
  /** Projects in idle state */
  idle: number;
  /** Projects waiting for input */
  waiting: number;
  /** Projects with errors */
  withErrors: number;
  /** Projects with all work completed */
  allCompleted: number;
}

/**
 * AggregateStatus - Summary metrics across all projects
 *
 * Provides a bird's-eye view of work status across the entire workspace,
 * useful for dashboard headers and summary widgets.
 */
export interface AggregateStatus {
  /** Counts of projects by health status */
  projectCounts: AggregateProjectCounts;
  /** Aggregate feature counts across all projects */
  featureCounts: AggregateFeatureCounts;
  /** Total unread notifications across all projects */
  totalUnreadNotifications: number;
  /** Number of projects with auto-mode running */
  projectsWithAutoModeRunning: number;
  /** ISO timestamp when this aggregate was computed */
  computedAt: string;
  /** Extensibility for future properties */
  [key: string]: unknown;
}

// ============================================================================
// Recent Activity Types
// ============================================================================

/**
 * ActivityType - Types of activities that can appear in the activity feed
 *
 * Maps to significant events that users would want to see in an overview.
 */
export type ActivityType =
  | 'feature_created'
  | 'feature_started'
  | 'feature_completed'
  | 'feature_failed'
  | 'feature_verified'
  | 'auto_mode_started'
  | 'auto_mode_stopped'
  | 'ideation_session_started'
  | 'ideation_session_ended'
  | 'idea_created'
  | 'idea_converted'
  | 'notification_created'
  | 'project_opened';

/**
 * ActivitySeverity - Visual importance level for activity items
 */
export type ActivitySeverity = 'info' | 'success' | 'warning' | 'error';

/**
 * RecentActivity - A single activity entry for the activity feed
 *
 * Represents a notable event that occurred in a project, displayed
 * in chronological order in the activity feed widget.
 */
export interface RecentActivity {
  /** Unique identifier for this activity entry */
  id: string;
  /** Project this activity belongs to */
  projectId: string;
  /** Project display name (denormalized for display) */
  projectName: string;
  /** Type of activity */
  type: ActivityType;
  /** Human-readable description of what happened */
  description: string;
  /** Visual importance level */
  severity: ActivitySeverity;
  /** ISO timestamp when the activity occurred */
  timestamp: string;
  /** Related feature ID if applicable */
  featureId?: string;
  /** Related feature title if applicable */
  featureTitle?: string;
  /** Related ideation session ID if applicable */
  sessionId?: string;
  /** Related idea ID if applicable */
  ideaId?: string;
  /** Extensibility for future properties */
  [key: string]: unknown;
}

/**
 * ActivityFeedOptions - Options for fetching activity feed
 */
export interface ActivityFeedOptions {
  /** Maximum number of activities to return */
  limit?: number;
  /** Filter to specific project IDs */
  projectIds?: string[];
  /** Filter to specific activity types */
  types?: ActivityType[];
  /** Only return activities after this ISO timestamp */
  since?: string;
  /** Only return activities before this ISO timestamp */
  until?: string;
}

// ============================================================================
// Multi-Project Overview Response Types
// ============================================================================

/**
 * MultiProjectOverview - Complete overview data for the dashboard
 *
 * Contains all data needed to render the multi-project overview page,
 * including individual project statuses, aggregate metrics, and recent activity.
 */
export interface MultiProjectOverview {
  /** Individual status for each project */
  projects: ProjectStatus[];
  /** Aggregate metrics across all projects */
  aggregate: AggregateStatus;
  /** Recent activity feed (sorted by timestamp, most recent first) */
  recentActivity: RecentActivity[];
  /** ISO timestamp when this overview was generated */
  generatedAt: string;
}

/**
 * ProjectOverviewError - Error response for overview requests
 */
export interface ProjectOverviewError {
  /** Error code for programmatic handling */
  code: 'PROJECTS_NOT_FOUND' | 'PERMISSION_DENIED' | 'INTERNAL_ERROR';
  /** Human-readable error message */
  message: string;
  /** Project IDs that failed to load, if applicable */
  failedProjectIds?: string[];
}
