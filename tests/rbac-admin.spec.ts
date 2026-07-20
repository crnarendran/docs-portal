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

    // The Cloud Function only auto-grants admin to crnarendran@gmail.com.
    // For E2E tests, we must manually set the claim for our test admin user.
    await auth.setCustomUserClaims(adminUser.uid, { admin: true });

    // Seed Firestore with user roles/permissions
    await db.collection('portal_users').doc(standardUser1.uid).set({
      uid: standardUser1.uid,
      email: standardUser1.email,
      isAdmin: false,
      accessibleProjects: ['project-A'],
    });

    await db.collection('portal_users').doc(standardUser2.uid).set({
      uid: standardUser2.uid,
      email: standardUser2.email,
      isAdmin: false,
      accessibleProjects: ['project-A', 'project-C'],
    });

    await db.collection('portal_users').doc(adminUser.uid).set({
      uid: adminUser.uid,
      email: adminUser.email,
      isAdmin: true,
      accessibleProjects: ['*'],
    });

    // Also need project docs to exist potentially
    await db.collection('projects').doc('project-A').set({ name: 'Project A' });
    await db.collection('projects').doc('project-B').set({ name: 'Project B' });
    await db.collection('projects').doc('project-C').set({ name: 'Project C' });
    await db.collection('projects').doc('project-D').set({ name: 'Project D' });

    // Wait for any async Cloud Functions (like createPortalUserDocument) to finish and settle
    await new Promise(r => setTimeout(r, 3000));
  });

  async function login(page, email, password) {
    await page.goto('/login');
    
    // Wait for React hydration to attach onChange listeners
    await expect(page.getByTestId('login-email')).toBeEditable({ timeout: 5000 });

    // Using Option B: Expect test-only email/password fields to be rendered when NEXT_PUBLIC_USE_EMULATORS='true'
    await page.getByTestId('login-email').fill(email);
    await page.getByTestId('login-password').fill(password);
    await page.getByTestId('login-submit').click({ force: true });
    
    // Wait for the auth context to update and render the sidebar's logged-in view
    await expect(page.getByTestId('logout-btn')).toBeVisible({ timeout: 10000 });
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

    await expect(projectSelector).toContainText('project-A');
    await expect(projectSelector).toContainText('project-C');
    await expect(projectSelector).not.toContainText('project-B');
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
    
    // Wait for the save to complete: the save-user-btn disappears
    // when editingUserId is set to null after successful updateDoc.
    await expect(page.getByTestId('save-user-btn')).toBeHidden({ timeout: 10000 });

    // Verify the user row now shows project-D before logging out
    const updatedRow = page.locator('[data-testid="user-row"]', { hasText: 'standard1@example.com' });
    await expect(updatedRow).toContainText('project-D', { timeout: 5000 });

    // Logout — the /admin page shows "access denied" when unauthenticated,
    // so navigate explicitly to /login after logout completes.
    await page.getByTestId('logout-btn').click({ force: true });
    await page.goto('/login');
    await expect(page.getByTestId('login-email')).toBeVisible({ timeout: 5000 });
    
    await login(page, 'standard1@example.com', 'password123');
    await page.goto('/');

    const projectSelector = page.getByTestId('project-selector');
    await expect(projectSelector).toBeVisible();
    
    // Assertion: project-D should now be visible
    await expect(projectSelector).toContainText('project-D');
  });

  test('Admin Promotion - Toggling grants a standard user admin access', async ({ page }) => {
    // Authenticate as the existing admin
    await login(page, 'admin@example.com', 'password123');

    await page.goto('/admin');
    await expect(page.getByTestId('admin-dashboard')).toBeVisible();

    const userRow = page.locator('[data-testid="user-row"]', { hasText: 'standard2@example.com' });
    const toggleBtn = userRow.getByTestId('toggle-admin-btn');
    await expect(toggleBtn).toContainText('No');

    await toggleBtn.click({ force: true });

    // Wait for the callable + refetch to resolve and flip the button's own label
    await expect(toggleBtn).toContainText('Yes', { timeout: 10000 });

    await page.getByTestId('logout-btn').click({ force: true });
    await page.goto('/login');
    await expect(page.getByTestId('login-email')).toBeVisible({ timeout: 5000 });

    // The newly-promoted user should now be able to load the admin dashboard
    await login(page, 'standard2@example.com', 'password123');
    await page.goto('/admin');
    await expect(page.getByTestId('admin-dashboard')).toBeVisible({ timeout: 10000 });
  });
});
