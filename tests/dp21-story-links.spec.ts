import { test, expect } from '@playwright/test';
import { FIXTURE, STORIES } from './support/seed';

// DP-21: every spec table row whose first cell is a story id gets a stable
// id="story-<ID>" and a copy-link button; the copied URL is
// <page>?env=<current>&story=<ID> and round-trips to the same row.
const path = `/${FIXTURE.project}/${STORIES.slug}`;
const buttons = (page: import('@playwright/test').Page) => page.getByTestId('story-link-btn');

test.describe('DP-21: story row links', () => {
  test('every story row has an id and a link button', async ({ page }) => {
    await page.goto(path);
    await expect(page.getByText('Story number 1', { exact: true })).toBeVisible();

    await expect(page.locator('tr[id^="story-"]')).toHaveCount(STORIES.count);
    await expect(buttons(page)).toHaveCount(STORIES.count);
    await expect(page.locator('#story-FX-1')).toBeAttached();
    await expect(page.locator(`#story-FX-${STORIES.count}`)).toBeAttached();
    await expect(page.locator('#story-FX-1').getByTestId('story-link-btn')).toHaveCount(1);
  });

  test('non-story tables and multi-id rows get no button or id', async ({ page }) => {
    await page.goto(path);
    await expect(page.getByText('alpha', { exact: true })).toBeVisible();

    await expect(page.locator('table', { hasText: 'alpha' }).getByTestId('story-link-btn')).toHaveCount(0);
    await expect(page.locator('table', { hasText: 'alpha' }).locator('tr[id]')).toHaveCount(0);
    await expect(page.locator('tr', { hasText: 'FX-91, FX-92' }).getByTestId('story-link-btn')).toHaveCount(0);
  });

  test('clicking the button copies the canonical URL and says "Link copied"', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(path);
    const btn = page.locator(`#story-${STORIES.late}`).getByTestId('story-link-btn');
    await btn.scrollIntoViewIfNeeded();
    await btn.click();

    await expect(page.getByText('Link copied')).toBeVisible();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toBe(`http://localhost:3001${path}?env=staging&story=${STORIES.late}`);

    // The confirmation goes away by itself.
    await expect(page.getByText('Link copied')).toHaveCount(0, { timeout: 5000 });
  });

  test('the copied URL round-trips to the same row, in view', async ({ page }) => {
    await page.goto(`${path}?env=staging&story=${STORIES.late}`);
    const row = page.locator(`#story-${STORIES.late}`);
    await expect(row).toBeInViewport({ timeout: 10000 });
    // Rows elsewhere in the table are still there and still have buttons.
    await expect(buttons(page)).toHaveCount(STORIES.count);
  });

  test('on a phone the button is at least a 44px tap target', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(path);
    const btn = page.locator('#story-FX-1').getByTestId('story-link-btn');
    await expect(btn).toBeVisible();
    const box = await btn.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });
});
