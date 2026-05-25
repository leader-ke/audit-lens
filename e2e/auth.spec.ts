import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('sign-in page renders form', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.getByRole('heading').first()).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('sign-in page has submit button', async ({ page }) => {
    await page.goto('/auth/login');
    const submitBtn = page.getByRole('button', { name: /sign in|log in|login/i });
    await expect(submitBtn).toBeVisible();
  });

  test('sign-in page shows error for empty submission', async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByRole('button', { name: /sign in|log in|login/i }).click();
    // Browser native validation or custom error message
    const emailInput = page.locator('input[type="email"]');
    const validity = await emailInput.evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(validity).toBe(false);
  });

  test('sign-up page renders', async ({ page }) => {
    await page.goto('/auth/signup');
    await expect(page.getByRole('heading').first()).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('sign-in link exists on sign-up page', async ({ page }) => {
    await page.goto('/auth/signup');
    const signInLink = page.getByRole('link', { name: /sign in|log in|already have/i });
    await expect(signInLink).toBeVisible();
  });

  test('unauthenticated /dashboard redirects to auth', async ({ page }) => {
    const response = await page.goto('/dashboard');
    // Either a redirect to auth, or a 401/403
    const url = page.url();
    const isRedirected = url.includes('/auth') || url.includes('/sign-in') || url.includes('/login');
    const statusOk = response?.status() !== 200 || isRedirected;
    expect(statusOk).toBe(true);
  });
});
