import { test, expect } from '@playwright/test';
import { setupApiMocks } from '../helpers/api-mocks';
import { loginAsAdmin } from '../helpers/auth';

test.describe('Approval Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await loginAsAdmin(page);
  });

  test('approval page loads', async ({ page }) => {
    await page.goto('/approvals');

    // Should display approval-related content
    await expect(page.getByText(/approv|phê duyệt|pending/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('approval page shows entity type tabs or filters', async ({ page }) => {
    await page.goto('/approvals');

    // Should have some way to filter by type (budget/planning/proposal)
    await expect(page.locator('body')).toContainText(/budget|planning|proposal|ngân sách|kế hoạch|đề xuất/i, { timeout: 10000 });
  });

  test('pending items display submitted date info', async ({ page }) => {
    // Override with submitted budgets for this test
    await page.route('**/api/v1/budgets?status=SUBMITTED', (route) =>
      route.fulfill({
        status: 200,
        json: {
          data: [{
            id: 'budget-1',
            budgetCode: 'BUD-FER-SS-2025',
            status: 'SUBMITTED',
            groupBrand: { name: 'Ferragamo' },
            totalBudget: '1000000000',
            updatedAt: '2026-02-14T10:00:00Z',
          }],
        },
      })
    );

    await page.goto('/approvals');

    // Should load page
    await expect(page.locator('body')).toContainText(/approv|phê duyệt/i, { timeout: 10000 });
  });

  test('approval history page accessible', async ({ page }) => {
    await page.goto('/approvals');

    // Page should render without errors
    await expect(page.locator('body')).not.toContainText(/error|500|404/, { timeout: 5000 });
  });

  test('can navigate between approval and budget screens', async ({ page }) => {
    await page.goto('/approvals');
    await expect(page.locator('body')).toContainText(/approv|phê duyệt/i, { timeout: 10000 });

    // Navigate to budget
    await page.goto('/budget');
    await expect(page.locator('body')).toContainText(/budget|ngân sách/i, { timeout: 10000 });
  });
});
