import { test, expect } from '@playwright/test';
import { setupApiMocks } from '../helpers/api-mocks';
import { loginAsAdmin } from '../helpers/auth';

test.describe('Planning', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await loginAsAdmin(page);
  });

  test('planning page loads after login', async ({ page }) => {
    await page.goto('/planning');

    await expect(page.getByText(/planning|kế hoạch|phân bổ/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('planning page shows version info', async ({ page }) => {
    await page.goto('/planning');

    // Should display version number or name from fixture
    await expect(page.locator('body')).toContainText(/version|phiên bản|V1/i, { timeout: 10000 });
  });

  test('planning page displays collection dimensions', async ({ page }) => {
    await page.goto('/planning');

    // Should show collection names from fixtures
    await expect(page.locator('body')).toContainText(/carry over|seasonal/i, { timeout: 10000 });
  });

  test('planning page renders without errors', async ({ page }) => {
    await page.goto('/planning');

    // Should not show error pages
    await expect(page.locator('body')).not.toContainText(/error occurred|500|unhandled/i, { timeout: 5000 });
  });
});
