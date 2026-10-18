import { expect, type Page } from '@playwright/test';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { EMULATOR_PROJECT, useEmulatorsForAdminSdk } from './emulator';

// Creates (or reuses) an emulator user plus the portal_users doc the app reads
// its project access from.
export async function ensureUser(uid: string, email: string, password: string, projects: string[]) {
  useEmulatorsForAdminSdk();
  if (!getApps().length) initializeApp({ projectId: EMULATOR_PROJECT });
  const auth = getAuth();
  let user;
  try {
    user = await auth.createUser({ uid, email, password });
  } catch (e: any) {
    if (e.code !== 'auth/uid-already-exists') throw e;
    user = await auth.getUser(uid);
  }
  await getFirestore().collection('portal_users').doc(uid).set({
    uid,
    email,
    isAdmin: false,
    accessibleProjects: projects,
  });
  return user;
}

// Fills and submits the emulator sign-in form on the page that is already
// showing it (the login page). Waits for hydration first: submitting earlier
// is a native GET that drops the form.
export async function submitLoginForm(page: Page, email: string, password: string) {
  await page.waitForLoadState('networkidle');
  await expect(page.getByTestId('login-email')).toBeEditable({ timeout: 15000 });
  await page.getByTestId('login-email').fill(email);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit').click({ force: true });
}
