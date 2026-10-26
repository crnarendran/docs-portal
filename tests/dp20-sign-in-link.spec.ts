import { test, expect } from '@playwright/test';
import { FIXTURE, GATED_STORIES } from './support/seed';
import { ensureUser, submitLoginForm } from './support/auth';

// DP-20: a signed-out visit to a deep link survives the login round trip —
// path, query (?env=, ?story=) and hash — and the redirect target is still
// restricted to same-origin paths.
const EMAIL = 'dp20@example.com';
const PASSWORD = 'password123';
const ORIGIN = 'http://localhost:3001';
const gatedPath = `/${FIXTURE.project}/${GATED_STORIES.slug}`;

test.describe('DP-20: sign-in keeps the whole link', () => {
  test.beforeAll(async () => {
    await ensureUser('dp20_user_1', EMAIL, PASSWORD, [FIXTURE.project]);
  });

  test('a signed-out deep link lands, after sign-in, on the exact URL with the story row in view', async ({ page }) => {
    const target = `${gatedPath}?env=dev&story=${GATED_STORIES.late}#notes`;
    await page.goto(target);

    await expect(page).toHaveURL(/\/login\?next=/, { timeout: 15000 });
    await submitLoginForm(page, EMAIL, PASSWORD);

    await page.waitForURL(`${ORIGIN}${target}`, { timeout: 30000 });
    await expect(page.locator(`#story-${GATED_STORIES.late}`)).toBeInViewport({ timeout: 15000 });
  });

  // 60 s for the two refusal tests: each does a full emulator sign-in on a
  // cold route and flaked at the 30 s default on Firefox/WebKit (page.goto /
  // waitForURL timeouts, not wrong redirects).
  test('next=//evil.example is still refused', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/login?next=' + encodeURIComponent('//evil.example/steal'));
    await submitLoginForm(page, EMAIL, PASSWORD);

    await page.waitForURL((u) => u.pathname !== '/login', { timeout: 30000 });
    const url = new URL(page.url());
    expect(url.origin).toBe(ORIGIN);
    expect(url.pathname).toBe('/');
  });

  test('next=/\\evil.example (backslash form) is refused too', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/login?next=' + encodeURIComponent('/\\evil.example/steal'));
    await submitLoginForm(page, EMAIL, PASSWORD);

    await page.waitForURL((u) => u.pathname !== '/login', { timeout: 30000 });
    const url = new URL(page.url());
    expect(url.origin).toBe(ORIGIN);
    expect(url.pathname).toBe('/');
  });
});
