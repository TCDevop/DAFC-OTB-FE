import { test, expect } from '@playwright/test';
import { setupApiMocks } from '../helpers/api-mocks';
import { loginAsAdmin } from '../helpers/auth';

test.describe('Budget Management', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await loginAsAdmin(page);
  });

  test('budget management screen loads after login', async ({ page }) => {
    await page.goto('/budget');

    // Wait for page to load — look for heading or key text
    await expect(page.getByText(/budget|ngân sách/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('budget grid displays brand names', async ({ page }) => {
    await page.goto('/budget');

    // Should show at least one brand from fixtures
    await expect(page.getByText('Ferragamo').first()).toBeVisible({ timeout: 10000 });
  });

  test('budget grid displays season columns', async ({ page }) => {
    await page.goto('/budget');

    // Should show SS or FW season indicators
    await expect(page.getByText(/SS|FW/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('budget displays total amount', async ({ page }) => {
    await page.goto('/budget');

    // The formatted budget amount should be visible somewhere on page
    // 1,000,000,000 VND → displayed in some formatted way
    await expect(page.locator('body')).toContainText(/1[.,]000/, { timeout: 10000 });
  });

  test('budget shows draft status', async ({ page }) => {
    await page.goto('/budget');

    // Draft status indicator should be visible
    await expect(page.getByText(/draft|nháp/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('can navigate to budget allocate view', async ({ page }) => {
    await page.goto('/budget/allocate');

    // Should load allocate page content
    await expect(page.locator('body')).toContainText(/budget|phân bổ|allocat/i, { timeout: 10000 });
  });
});
