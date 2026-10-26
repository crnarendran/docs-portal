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

// Resolves once React has hydrated the element: React attaches its props
// object to a DOM node under a `__reactProps$...` key only when it takes the
// node over. Until then, the server-rendered controlled <input> still has
// state '' behind it, and hydration clears whatever the test typed (seen in a
// WebKit trace: email and password filled, THEN the first client effect ran,
// then submit sent an empty email -> auth/invalid-email). networkidle and
// toBeEditable do not guarantee this.
export async function waitForHydrated(page: Page, testId: string) {
  await page.waitForFunction(
    (id) => {
      const el = document.querySelector(`[data-testid="${id}"]`);
      return !!el && Object.keys(el).some((k) => k.startsWith('__reactProps$'));
    },
    testId,
    { timeout: 30000 }
  );
}

// Fills and submits the emulator sign-in form on the page that is already
// showing it (the login page), then waits for the page to leave /login.
// Returning only once the login page's own redirect has finished matters: a
// caller's next page.goto() would otherwise race that redirect ("Navigation
// ... is interrupted by another navigation to /").
export async function submitLoginForm(page: Page, email: string, password: string) {
  await waitForHydrated(page, 'login-email');
  const emailInput = page.getByTestId('login-email');
  const passwordInput = page.getByTestId('login-password');
  await emailInput.fill(email);
  await passwordInput.fill(password);
  await expect(emailInput).toHaveValue(email);
  await expect(passwordInput).toHaveValue(password);
  await page.getByTestId('login-submit').click({ force: true });
  await page.waitForURL((u) => u.pathname !== '/login', { timeout: 30000 });
}

// goto('/login') + submit + wait for the signed-in sidebar.
export async function signIn(page: Page, email: string, password: string) {
  await page.goto('/login');
  await submitLoginForm(page, email, password);
  await expect(page.getByTestId('logout-btn')).toBeVisible({ timeout: 30000 });
}
