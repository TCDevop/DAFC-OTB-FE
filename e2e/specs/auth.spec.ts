import { test, expect } from '@playwright/test';
import { setupApiMocks } from '../helpers/api-mocks';
import { loginAsAdmin } from '../helpers/auth';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });

  test('login page displays form elements', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByTestId('email-input')).toBeVisible();
    await expect(page.getByTestId('password-input')).toBeVisible();
    await expect(page.getByTestId('submit-button')).toBeVisible();
  });

  test('successful login redirects to dashboard', async ({ page }) => {
    await loginAsAdmin(page);

    // Should be on dashboard (not /login)
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('invalid credentials shows error', async ({ page }) => {
    await page.goto('/login');

    await page.getByTestId('email-input').fill('wrong@email.com');
    await page.getByTestId('password-input').fill('wrongpassword');
    await page.getByTestId('submit-button').click();

    await expect(page.getByTestId('error-message')).toBeVisible({ timeout: 5000 });
  });

  test('demo account button fills credentials', async ({ page }) => {
    await page.goto('/login');

    // Click the first demo account button (admin)
    await page.getByRole('button', { name: /admin/i }).click();

    // Verify the email field was filled
    await expect(page.getByTestId('email-input')).toHaveValue('admin@dafc.com');
  });

  test('unauthenticated access redirects to login', async ({ page }) => {
    // Try to access a protected route without logging in
    await page.goto('/budget');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });
});
