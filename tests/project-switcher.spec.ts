import { test, expect } from '@playwright/test';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth, UserRecord } from 'firebase-admin/auth';

// Initialize firebase admin for emulator if not already
if (!getApps().length) {
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
  process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
  initializeApp({
    projectId: 'sanjeev-ai',
  });
}

const db = getFirestore();
const auth = getAuth();

test.describe('Adversarial QA - Project Switcher', () => {
  let switcherUser: UserRecord;

  test.beforeAll(async () => {
    const safelyCreateUser = async (userData) => {
      try {
        return await auth.createUser(userData);
      } catch (e: any) {
        if (e.code === 'auth/uid-already-exists') {
          return await auth.getUser(userData.uid);
        }
        throw e;
      }
    };

    switcherUser = await safelyCreateUser({
      uid: 'switcher_user_1',
      email: 'switcher@example.com',
      password: 'password123',
    });

    // Seed portal_users doc with multiple projects
    await db.collection('portal_users').doc(switcherUser.uid).set({
      uid: switcherUser.uid,
      email: switcherUser.email,
      isAdmin: false,
      accessibleProjects: ['project-A', 'project-B'],
    });

    // Ensure project docs exist
    await db.collection('projects').doc('project-A').set({ name: 'Project A' });
    await db.collection('projects').doc('project-B').set({ name: 'Project B' });

    // Wait for Cloud Function settling
    await new Promise(r => setTimeout(r, 2000));
  });

  async function login(page, email, password) {
    await page.goto('/login');
    await expect(page.getByTestId('login-email')).toBeEditable({ timeout: 5000 });
    await page.getByTestId('login-email').fill(email);
    await page.getByTestId('login-password').fill(password);
    await page.getByTestId('login-submit').click({ force: true });
    await expect(page.getByTestId('logout-btn')).toBeVisible({ timeout: 10000 });
  }

  test('should update global state or navigation when project is switched', async ({ page }) => {
    await login(page, 'switcher@example.com', 'password123');
    await page.goto('/');

    const projectSelector = page.getByTestId('project-selector');
    await expect(projectSelector).toBeVisible();

    // Select a project that actually exists in the user's accessible list
    await projectSelector.selectOption('project-B');

    // Assertion: URL should reflect the new project
    await expect(page).toHaveURL(/.*project=project-B/, { timeout: 5000 });
  });

  test('should initialize the project selector from query parameters', async ({ page }) => {
    await login(page, 'switcher@example.com', 'password123');

    // Navigate with a valid project in the query param
    await page.goto('/?project=project-B');
    const projectSelector = page.getByTestId('project-selector');
    await expect(projectSelector).toHaveValue('project-B', { timeout: 5000 });
  });
});
