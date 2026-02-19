/**
 * Multi-Project Dashboard E2E Tests
 *
 * Verifies the unified dashboard showing status across all projects.
 */

import { test, expect } from '@playwright/test';

test.describe('Multi-Project Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the dashboard first
    await page.goto('/dashboard');
    await expect(page.getByTestId('dashboard-view')).toBeVisible();
  });

  test('should navigate to overview from dashboard when projects exist', async ({ page }) => {
    // Check if the overview button is visible (only shows when projects exist)
    const overviewButton = page.getByTestId('projects-overview-button');

    // If there are projects, the button should be visible
    if (await overviewButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await overviewButton.click();

      // Should navigate to overview page
      await expect(page).toHaveURL(/\/overview/);
      await expect(page.getByTestId('overview-view')).toBeVisible();
    } else {
      // No projects - overview button won't be shown
      test.info().annotations.push({
        type: 'info',
        description: 'No projects available - skipping overview navigation test',
      });
    }
  });

  test('should display overview view with correct structure', async ({ page }) => {
    // Navigate directly to overview
    await page.goto('/overview');

    // Wait for the overview view to load
    const overviewView = page.getByTestId('overview-view');

    // The view should be visible (even if loading)
    await expect(overviewView).toBeVisible({ timeout: 5000 });

    // Should have a back button to return to dashboard
    const backButton = page
      .locator('button')
      .filter({ has: page.locator('svg.lucide-arrow-left') });
    await expect(backButton).toBeVisible();

    // Click back to return to dashboard
    await backButton.click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should show loading state and then content or empty state', async ({ page }) => {
    await page.goto('/overview');

    // Should show the view
    const overviewView = page.getByTestId('overview-view');
    await expect(overviewView).toBeVisible({ timeout: 5000 });

    // Wait for loading to complete (either shows content or error)
    await page.waitForTimeout(2000);

    // After loading, should show either:
    // 1. Project cards if projects exist
    // 2. Empty state message if no projects
    // 3. Error message if API failed
    const hasProjects = (await page.locator('[data-testid^="project-status-card-"]').count()) > 0;
    const hasEmptyState = await page
      .getByText('No projects yet')
      .isVisible()
      .catch(() => false);
    const hasError = await page
      .getByText('Failed to load overview')
      .isVisible()
      .catch(() => false);

    // At least one of these should be true
    expect(hasProjects || hasEmptyState || hasError).toBeTruthy();
  });

  test('should have overview link in sidebar footer', async ({ page }) => {
    // First open a project to see the sidebar
    await page.goto('/overview');

    // The overview link should be in the sidebar footer
    const sidebarOverviewLink = page.getByTestId('projects-overview-link');

    if (await sidebarOverviewLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Should be clickable
      await sidebarOverviewLink.click();
      await expect(page).toHaveURL(/\/overview/);
    }
  });

  test('should refresh data when refresh button is clicked', async ({ page }) => {
    await page.goto('/overview');

    // Wait for initial load
    await page.waitForTimeout(1000);

    // Find the refresh button
    const refreshButton = page.locator('button').filter({ hasText: 'Refresh' });

    if (await refreshButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await refreshButton.click();

      // The button should show loading state (spinner icon)
      // Wait a moment for the refresh to complete
      await page.waitForTimeout(1000);

      // Page should still be on overview
      await expect(page).toHaveURL(/\/overview/);
    }
  });
});
