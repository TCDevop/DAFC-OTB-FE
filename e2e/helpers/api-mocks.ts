import { Page } from '@playwright/test';
import authFixtures from '../fixtures/auth.json';
import budgetFixtures from '../fixtures/budgets.json';
import planningFixtures from '../fixtures/planning.json';
import masterDataFixtures from '../fixtures/master-data.json';

/**
 * Intercept all /api/v1/* calls with fixture data.
 * Enables CI to run without a live backend.
 */
export async function setupApiMocks(page: Page) {
  // Auth
  await page.route('**/api/v1/auth/login', (route) => {
    const body = route.request().postDataJSON();
    if (body?.email === 'admin@dafc.com' && body?.password === 'dafc@2026') {
      return route.fulfill({ status: 200, json: authFixtures.loginSuccess });
    }
    return route.fulfill({ status: 401, json: authFixtures.loginFailure });
  });

  await page.route('**/api/v1/auth/me', (route) =>
    route.fulfill({ status: 200, json: authFixtures.profile })
  );

  await page.route('**/api/v1/auth/refresh', (route) =>
    route.fulfill({ status: 200, json: authFixtures.loginSuccess })
  );

  // Master Data
  await page.route('**/api/v1/master/brands', (route) =>
    route.fulfill({ status: 200, json: masterDataFixtures.brands })
  );
  await page.route('**/api/v1/master/stores', (route) =>
    route.fulfill({ status: 200, json: masterDataFixtures.stores })
  );
  await page.route('**/api/v1/master/collections', (route) =>
    route.fulfill({ status: 200, json: masterDataFixtures.collections })
  );
  await page.route('**/api/v1/master/genders', (route) =>
    route.fulfill({ status: 200, json: masterDataFixtures.genders })
  );
  await page.route('**/api/v1/master/categories', (route) =>
    route.fulfill({ status: 200, json: masterDataFixtures.categories })
  );
  await page.route('**/api/v1/master/seasons', (route) =>
    route.fulfill({ status: 200, json: masterDataFixtures.seasons })
  );
  await page.route('**/api/v1/master/sku-catalog*', (route) =>
    route.fulfill({ status: 200, json: { data: [] } })
  );

  // Budgets
  await page.route('**/api/v1/budgets/statistics', (route) =>
    route.fulfill({ status: 200, json: { data: { total: 1, draft: 1, submitted: 0, approved: 0 } } })
  );
  await page.route('**/api/v1/budgets', (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ status: 200, json: budgetFixtures.list });
    }
    return route.fulfill({ status: 201, json: budgetFixtures.created });
  });
  await page.route('**/api/v1/budgets/*/submit', (route) =>
    route.fulfill({ status: 200, json: budgetFixtures.submitted })
  );
  await page.route('**/api/v1/budgets/*/approve/*', (route) =>
    route.fulfill({ status: 200, json: { data: { status: 'LEVEL1_APPROVED' } } })
  );

  // Planning
  await page.route('**/api/v1/planning', (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ status: 200, json: planningFixtures.list });
    }
    return route.fulfill({ status: 201, json: planningFixtures.detail });
  });
  await page.route('**/api/v1/planning/*/submit', (route) =>
    route.fulfill({ status: 200, json: { data: { status: 'SUBMITTED' } } })
  );

  // Proposals
  await page.route('**/api/v1/proposals/statistics*', (route) =>
    route.fulfill({ status: 200, json: { data: { total: 0 } } })
  );
  await page.route('**/api/v1/proposals', (route) =>
    route.fulfill({ status: 200, json: { data: [] } })
  );

  // Approvals (aggregated calls)
  await page.route('**/api/v1/approvals/**', (route) =>
    route.fulfill({ status: 200, json: { data: [] } })
  );
}
