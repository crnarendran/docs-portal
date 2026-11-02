import { test, expect } from '@playwright/test';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { EMULATOR_PROJECT, useEmulatorsForAdminSdk } from './support/emulator';
import { signIn } from './support/auth';

// A project grant that reaches the user's portal_users doc AFTER they are
// already signed in and looking at the page (a slow createPortalUserDocument,
// or an admin granting access mid-session) must show up without a reload:
// AuthContext listens to the doc live and Sidebar refetches on the change.
// This is the property the "Invite by Email" spec depends on when the Functions
// emulator is slow; asserting it directly separates "the UI does not update"
// from "the backend was late".
if (!getApps().length) {
  useEmulatorsForAdminSdk();
  initializeApp({ projectId: EMULATOR_PROJECT });
}

test('a grant that arrives after sign-in appears in the project selector without a reload', async ({ page }) => {
  const uid = 'late_grant_user_1';
  const email = 'late-grant@example.com';
  const db = getFirestore();
  const auth = getAuth();

  await auth.createUser({ uid, email, password: 'password123' }).catch((e: any) => {
    if (e.code !== 'auth/uid-already-exists') throw e;
  });
  // The auth trigger creates portal_users/{uid} with no projects; wait for it
  // so the next write is unambiguously the "late" grant.
  await expect
    .poll(async () => (await db.collection('portal_users').doc(uid).get()).exists, { timeout: 60000 })
    .toBe(true);
  await db.collection('portal_users').doc(uid).update({ accessibleProjects: [] });

  await signIn(page, email, 'password123');
  await page.goto('/');
  const selector = page.getByTestId('project-selector');
  await expect(selector).toBeVisible();
  await expect(selector).not.toContainText('keystar');

  await db.collection('portal_users').doc(uid).update({ accessibleProjects: ['keystar'] });

  await expect(selector).toContainText('keystar', { timeout: 10000 });
});
