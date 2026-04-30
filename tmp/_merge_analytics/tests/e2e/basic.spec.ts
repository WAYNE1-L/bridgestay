import { test, expect } from '@playwright/test';

test.describe('BridgeStay Analytics', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/');
    
    // Check that the page loads
    await expect(page).toHaveTitle(/BridgeStay Analytics/);
    
    // Check for main navigation elements
    await expect(page.locator('nav')).toBeVisible();
    
    // Check for key sections
    await expect(page.locator('h1')).toContainText(/Real Estate Investment Analysis/);
  });

  test('should navigate to dashboard', async ({ page }) => {
    await page.goto('/');
    
    // Click on dashboard link
    await page.click('a[href="/dashboard"]');
    
    // Wait for navigation
    await page.waitForURL('**/dashboard');
    
    // Check dashboard content
    await expect(page.locator('h1')).toContainText(/Dashboard/);
  });

  test('should navigate to ROI calculator', async ({ page }) => {
    await page.goto('/');
    
    // Click on ROI calculator link
    await page.click('a[href="/roi"]');
    
    // Wait for navigation
    await page.waitForURL('**/roi');
    
    // Check calculator content
    await expect(page.locator('h1')).toContainText(/ROI Calculator/);
  });

  test('should navigate to reports', async ({ page }) => {
    await page.goto('/');
    
    // Click on reports link
    await page.click('a[href="/report"]');
    
    // Wait for navigation
    await page.waitForURL('**/report');
    
    // Check reports content
    await expect(page.locator('h1')).toContainText(/Reports/);
  });

  test('should handle 404 pages gracefully', async ({ page }) => {
    const response = await page.goto('/non-existent-page');
    expect(response?.status()).toBe(404);
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Check that navigation is accessible on mobile
    await expect(page.locator('nav')).toBeVisible();
    
    // Check that main content is readable
    await expect(page.locator('h1')).toBeVisible();
  });
});
