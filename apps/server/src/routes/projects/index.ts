/**
 * Projects routes - HTTP API for multi-project overview and management
 */

import { Router } from 'express';
import type { FeatureLoader } from '../../services/feature-loader.js';
import type { AutoModeService } from '../../services/auto-mode-service.js';
import type { SettingsService } from '../../services/settings-service.js';
import type { NotificationService } from '../../services/notification-service.js';
import { createOverviewHandler } from './routes/overview.js';

export function createProjectsRoutes(
  featureLoader: FeatureLoader,
  autoModeService: AutoModeService,
  settingsService: SettingsService,
  notificationService: NotificationService
): Router {
  const router = Router();

  // GET /overview - Get aggregate status for all projects
  router.get(
    '/overview',
    createOverviewHandler(featureLoader, autoModeService, settingsService, notificationService)
  );

  return router;
}
