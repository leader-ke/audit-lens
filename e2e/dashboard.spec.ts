import { test, expect, type Page } from '@playwright/test';

// ── Shared auth helper ────────────────────────────────────────────────────────
// These tests use a pre-seeded test account. Set TEST_USER_EMAIL and
// TEST_USER_PASSWORD in your CI environment (or .env.test) to enable them.

const TEST_EMAIL    = process.env.TEST_USER_EMAIL    ?? '';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD ?? '';

async function signIn(page: Page) {
  await page.goto('/auth/sign-in');
  await page.locator('input[type="email"]').fill(TEST_EMAIL);
  await page.locator('input[type="password"]').fill(TEST_PASSWORD);
  await page.getByRole('button', { name: /sign in|log in|login/i }).click();
  // Wait for redirect to dashboard
  await page.waitForURL('**/dashboard**', { timeout: 15_000 });
}

// ── Auth-required tests (skipped when no credentials provided) ────────────────

test.describe('Dashboard - authenticated', () => {
  test.skip(!TEST_EMAIL || !TEST_PASSWORD, 'Set TEST_USER_EMAIL and TEST_USER_PASSWORD to run these tests');

  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test('dashboard loads and shows navigation', async ({ page }) => {
    await expect(page).toHaveURL(/dashboard/);
    // Nav/sidebar should be visible
    await expect(page.getByRole('navigation').first()).toBeVisible();
  });

  test('engagements list page renders', async ({ page }) => {
    await page.goto('/dashboard/engagements');
    await expect(page).toHaveURL(/engagements/);
    // Either shows engagements or an empty state
    const heading = page.getByRole('heading').first();
    await expect(heading).toBeVisible();
  });

  test('new engagement button is accessible from engagements page', async ({ page }) => {
    await page.goto('/dashboard/engagements');
    // Look for a create / new engagement CTA
    const newBtn = page.getByRole('button', { name: /new|create|add engagement/i })
      .or(page.getByRole('link', { name: /new|create/i }))
      .first();
    await expect(newBtn).toBeVisible();
  });
});

// ── Public / unauthenticated smoke tests ─────────────────────────────────────

test.describe('Dashboard - unauthenticated redirects', () => {
  test('visiting /dashboard without auth redirects', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).not.toHaveURL('/dashboard');
  });

  test('visiting /dashboard/engagements without auth redirects', async ({ page }) => {
    await page.goto('/dashboard/engagements');
    const url = page.url();
    expect(url).not.toContain('/dashboard/engagements');
  });
});

// ── API smoke tests ───────────────────────────────────────────────────────────

test.describe('API health', () => {
  test('GET /api/engagements returns 401 when unauthenticated', async ({ request }) => {
    const res = await request.get('/api/engagements');
    expect(res.status()).toBe(401);
  });
});
