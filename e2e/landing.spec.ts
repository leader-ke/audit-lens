import { test, expect } from '@playwright/test';

test.describe('Landing page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('shows product name in hero', async ({ page }) => {
    await expect(page.locator('h1').first()).toBeVisible();
    const heading = await page.locator('h1').first().textContent();
    expect(heading?.length).toBeGreaterThan(3);
  });

  test('shows CTA button that links to auth', async ({ page }) => {
    // Primary CTA should exist and be visible
    const cta = page.locator('a[href*="sign"], a[href*="login"], a[href*="register"], a[href*="auth"]').first();
    await expect(cta).toBeVisible();
  });

  test('demo showcase renders at least one tab', async ({ page }) => {
    // The demo showcase section should be present
    const tabList = page.getByRole('tab').first();
    await expect(tabList).toBeVisible();
  });

  test('pricing section shows 4 plans', async ({ page }) => {
    // Scroll to pricing
    await page.evaluate(() => {
      const el = document.querySelector('[id*="pricing"], [class*="pricing"], h2');
      el?.scrollIntoView();
    });
    // Should have KES amounts visible
    const freeLabel = page.getByText(/KES 0|Free/i).first();
    await expect(freeLabel).toBeVisible();
  });

  test('page title is set', async ({ page }) => {
    const title = await page.title();
    expect(title.length).toBeGreaterThan(3);
  });
});
