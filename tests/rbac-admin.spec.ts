import { test, expect } from '@playwright/test';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth, UserRecord } from 'firebase-admin/auth';

// Initialize firebase admin for emulator if not already
if (!getApps().length) {
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
  process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
  initializeApp({
    projectId: 'sanjeev-ai', // Strict requirement from skills
  });
}

const db = getFirestore();
const auth = getAuth();

test.describe('RBAC and Admin Screen E2E', () => {
  let standardUser1: UserRecord;
  let standardUser2: UserRecord;
  let adminUser: UserRecord;

  test.beforeEach(({ page }) => {
    page.on('console', msg => console.log(`[BROWSER]: ${msg.text()}`));
  });

  test.beforeAll(async () => {
    // Clean up previous test users if they exist
    try {
      await auth.deleteUser('standard_user_1');
      await auth.deleteUser('standard_user_2');
      await auth.deleteUser('admin_user_1');
    } catch (e) {
      // Ignore if they don't exist
    }

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

    // Create standard users
    standardUser1 = await safelyCreateUser({
      uid: 'standard_user_1',
      email: 'standard1@example.com',
      password: 'password123',
    });

    standardUser2 = await safelyCreateUser({
      uid: 'standard_user_2',
      email: 'standard2@example.com',
      password: 'password123',
    });

    // Create admin user
    adminUser = await safelyCreateUser({
      uid: 'admin_user_1',
      email: 'admin@example.com',
      password: 'password123',
    });

    // Set custom claims for admin
    await auth.setCustomUserClaims(adminUser.uid, { admin: true });

    // Seed Firestore with user roles/permissions
    await db.collection('portal_users').doc(standardUser1.uid).set({
      isAdmin: false,
      accessibleProjects: ['project-A'],
    });

    await db.collection('portal_users').doc(standardUser2.uid).set({
      isAdmin: false,
      accessibleProjects: ['project-A', 'project-C'],
    });

    await db.collection('portal_users').doc(adminUser.uid).set({
      isAdmin: true,
      accessibleProjects: ['*'],
    });

    // Also need project docs to exist potentially
    await db.collection('projects').doc('project-A').set({ name: 'Project A' });
    await db.collection('projects').doc('project-B').set({ name: 'Project B' });
    await db.collection('projects').doc('project-C').set({ name: 'Project C' });
    await db.collection('projects').doc('project-D').set({ name: 'Project D' });
  });

  async function login(page, email, password) {
    await page.goto('/login');
    
    // Using Option B: Expect test-only email/password fields to be rendered when NEXT_PUBLIC_USE_EMULATORS='true'
    await page.getByTestId('login-email').fill(email);
    await page.getByTestId('login-password').fill(password);
    await page.getByTestId('login-submit').click({ force: true });
    
    // Allow time for Firebase Auth emulator to resolve and redirect
    await page.waitForTimeout(1000);
  }

  test('Access Denied (Unauthorized) - Standard user cannot view unauthorized project', async ({ page }) => {
    await login(page, 'standard1@example.com', 'password123');
    
    // Attempt to navigate directly to project-B
    await page.goto('/projects/project-B');
    
    // Assertion: Should show Unauthorized or redirect
    await expect(page.getByTestId('unauthorized-message')).toBeAttached({ timeout: 5000 });
  });

  test('Project Dropdown Filtering - Only displays authorized projects', async ({ page }) => {
    await login(page, 'standard2@example.com', 'password123');
    
    await page.goto('/');
    
    const projectSelector = page.getByTestId('project-selector');
    await expect(projectSelector).toBeVisible();

    const optionsText = await projectSelector.innerText();
    expect(optionsText).toContain('project-A');
    expect(optionsText).toContain('project-C');
    expect(optionsText).not.toContain('project-B');
  });

  test('Admin Access and Granting Permissions', async ({ page }) => {
    // Authenticate as admin
    await login(page, 'admin@example.com', 'password123');
    
    // Navigate to Admin UI
    await page.goto('/admin');
    await expect(page.getByTestId('admin-dashboard')).toBeVisible();

    // Locate standard user 1 and edit their projects
    const userRow = page.locator('[data-testid="user-row"]', { hasText: 'standard1@example.com' });
    await userRow.getByTestId('edit-user-btn').click({ force: true });

    const projectSelect = page.getByTestId('admin-project-select');
    await projectSelect.selectOption('project-D');
    
    await page.getByTestId('save-user-btn').click({ force: true });
    
    // Wait for changes to persist
    await page.waitForTimeout(1000);

    // Logout and login as standard 1
    await page.getByTestId('logout-btn').click({ force: true });
    await page.waitForTimeout(1000);
    
    await login(page, 'standard1@example.com', 'password123');
    await page.goto('/');

    const projectSelector = page.getByTestId('project-selector');
    await expect(projectSelector).toBeVisible();
    
    // Assertion: project-D should now be visible
    const optionsText = await projectSelector.innerText();
    expect(optionsText).toContain('project-D');
  });
});
