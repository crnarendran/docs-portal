import { test, expect } from '@playwright/test';

test.describe('Adversarial QA - Project Switcher', () => {
  test('should update global state or navigation when project is switched', async ({ page }) => {
    await page.goto('/');
    
    const projectSelector = page.getByTestId('project-selector');
    await expect(projectSelector).toBeVisible();

    // Change the selection
    await projectSelector.selectOption('other');
    
    // Hostile assertion: We expect the URL to reflect the new project via standard Next.js navigation.
    await expect(page).toHaveURL(/.*project=other/);
  });

  test('should initialize the project selector from query parameters', async ({ page }) => {
    // Adversarial test: if the URL has ?project=other, the selector should reflect it, not default to sanjeev-ai.
    await page.goto('/?project=other');
    const projectSelector = page.getByTestId('project-selector');
    await expect(projectSelector).toHaveValue('other');
  });
});
