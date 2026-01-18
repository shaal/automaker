/**
 * Common utilities for backlog plan routes
 */

import { createLogger } from '@automaker/utils';
import { ensureAutomakerDir, getAutomakerDir } from '@automaker/platform';
import * as secureFs from '../../lib/secure-fs.js';
import path from 'path';
import type { BacklogPlanResult } from '@automaker/types';

const logger = createLogger('BacklogPlan');

// State for tracking running generation
let isRunning = false;
let currentAbortController: AbortController | null = null;
let runningDetails: {
  projectPath: string;
  prompt: string;
  model?: string;
  startedAt: string;
} | null = null;

const BACKLOG_PLAN_FILENAME = 'backlog-plan.json';

export interface StoredBacklogPlan {
  savedAt: string;
  prompt: string;
  model?: string;
  result: BacklogPlanResult;
}

export function getBacklogPlanStatus(): { isRunning: boolean } {
  return { isRunning };
}

export function setRunningState(running: boolean, abortController?: AbortController | null): void {
  isRunning = running;
  if (!running) {
    runningDetails = null;
  }
  if (abortController !== undefined) {
    currentAbortController = abortController;
  }
}

export function setRunningDetails(
  details: {
    projectPath: string;
    prompt: string;
    model?: string;
    startedAt: string;
  } | null
): void {
  runningDetails = details;
}

export function getRunningDetails(): {
  projectPath: string;
  prompt: string;
  model?: string;
  startedAt: string;
} | null {
  return runningDetails;
}

function getBacklogPlanPath(projectPath: string): string {
  return path.join(getAutomakerDir(projectPath), BACKLOG_PLAN_FILENAME);
}

export async function saveBacklogPlan(projectPath: string, plan: StoredBacklogPlan): Promise<void> {
  await ensureAutomakerDir(projectPath);
  const filePath = getBacklogPlanPath(projectPath);
  await secureFs.writeFile(filePath, JSON.stringify(plan, null, 2), 'utf-8');
}

export async function loadBacklogPlan(projectPath: string): Promise<StoredBacklogPlan | null> {
  try {
    const filePath = getBacklogPlanPath(projectPath);
    const raw = await secureFs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(raw as string) as StoredBacklogPlan;
    if (!Array.isArray(parsed?.result?.changes)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function clearBacklogPlan(projectPath: string): Promise<void> {
  try {
    const filePath = getBacklogPlanPath(projectPath);
    await secureFs.unlink(filePath);
  } catch {
    // ignore missing file
  }
}

export function getAbortController(): AbortController | null {
  return currentAbortController;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export function logError(error: unknown, context: string): void {
  logger.error(`[BacklogPlan] ${context}:`, getErrorMessage(error));
}

export { logger };
