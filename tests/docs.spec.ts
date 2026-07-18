import { test, expect } from '@playwright/test';

test.describe('Documentation Portal', () => {
  test('should render the navigation sidebar', async ({ page }) => {
    await page.goto('/');
    // Use data-testid as per constraints
    const sidebar = page.getByTestId('docs-sidebar');
    await expect(sidebar).toBeVisible();
    
    // Assume there is at least a heading in the sidebar
    const title = sidebar.getByTestId('sidebar-title');
    await expect(title).toBeVisible();
    await expect(title).toContainText('Sanjeev AI');
    await expect(title).toContainText('Documentation Portal');
  });

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/login');
    const loginContainer = page.getByTestId('login-container');
    await expect(loginContainer).toBeVisible();
    
    const loginBtn = page.getByTestId('login-button');
    await expect(loginBtn).toBeVisible();
  });
});
