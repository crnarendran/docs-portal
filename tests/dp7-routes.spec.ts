import { test, expect } from '@playwright/test';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { EMULATOR_PROJECT, useEmulatorsForAdminSdk } from './support/emulator';
import { FIXTURE } from './support/seed';
import { signIn } from './support/auth';

// DP-7 behaviours, against the seeded fixture (tests/support/seed.ts):
// a route that exists only in portal_docs_dev is generated, is marked as an
// unpromoted draft, a promoted doc is not marked, and ?env=dev swaps a doc's
// content for its dev-preview copy.
if (!getApps().length) {
  useEmulatorsForAdminSdk();
  initializeApp({ projectId: EMULATOR_PROJECT });
}

const route = (slug: string) => `/${FIXTURE.project}/${slug}`;

test.describe('DP-7: dev-preview routes', () => {
  test('a dev-only doc has a route and carries the draft banner', async ({ page }) => {
    const res = await page.goto(route(FIXTURE.devOnly.slug));
    expect(res?.status()).toBe(200);
    await expect(page.getByTestId('draft-banner')).toBeVisible();
    await expect(page.getByText(FIXTURE.devOnly.body)).toBeVisible();
  });

  test('a promoted doc has no draft banner', async ({ page }) => {
    await page.goto(route(FIXTURE.stagingOnly.slug));
    await expect(page.getByText(FIXTURE.stagingOnly.body)).toBeVisible();
    await expect(page.getByTestId('draft-banner')).toHaveCount(0);
  });

  test('a doc in both collections shows its promoted copy, with no banner', async ({ page }) => {
    await page.goto(route(FIXTURE.both.slug));
    await expect(page.getByText(FIXTURE.both.stagingBody)).toBeVisible();
    await expect(page.getByText(FIXTURE.both.devBody)).toHaveCount(0);
    await expect(page.getByTestId('draft-banner')).toHaveCount(0);
  });

  test('?env=dev swaps the content for the dev-preview copy', async ({ page }) => {
    // Reading portal_docs_dev from the browser needs a signed-in user
    // (firestore.rules); sanjeev-ai is open to any signed-in user.
    const auth = getAuth();
    const email = 'dp7@example.com';
    let user;
    try {
      user = await auth.createUser({ uid: 'dp7_user_1', email, password: 'password123' });
    } catch (e: any) {
      if (e.code !== 'auth/uid-already-exists') throw e;
      user = await auth.getUser('dp7_user_1');
    }
    await getFirestore().collection('portal_users').doc(user.uid).set({
      uid: user.uid,
      email,
      isAdmin: false,
      accessibleProjects: [FIXTURE.project],
    });

    await signIn(page, email, 'password123');

    await page.goto(`${route(FIXTURE.both.slug)}?env=dev`);
    await expect(page.getByText(FIXTURE.both.devBody)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(FIXTURE.both.stagingBody)).toHaveCount(0);
  });
});
