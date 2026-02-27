import { Page, expect } from '@playwright/test';

/**
 * Login as admin user via the login form.
 */
export async function loginAsAdmin(page: Page) {
  await page.goto('/login');

  await page.getByTestId('email-input').fill('admin@dafc.com');
  await page.getByTestId('password-input').fill('dafc@2026');
  await page.getByTestId('submit-button').click();

  // Wait for redirect away from login
  await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });
}
