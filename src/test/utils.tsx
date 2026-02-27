// src/test/utils.tsx
import { render, renderHook as rtlRenderHook, RenderOptions, RenderHookOptions } from '@testing-library/react';
import { ReactElement, ReactNode } from 'react';
import { AuthProvider } from '../contexts/AuthContext';
import { LanguageProvider } from '../contexts/LanguageContext';

// ─── Mock Data Factory ──────────────────────────────────────────

export const mockUser = (overrides = {}) => ({
  id: 'user-1',
  email: 'admin@dafc.com',
  name: 'Admin User',
  role: 'admin' as const,
  avatar: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

export const mockBudget = (overrides = {}) => ({
  id: 'budget-1',
  name: 'BUD-FER-SS-2025',
  code: 'BUD-FER-SS-2025',
  totalBudget: 1000000000,
  committedBudget: 650000000,
  status: 'draft' as const,
  brandId: 'brand-1',
  brand: mockGroupBrand(),
  fiscalYear: 2025,
  seasonGroup: 'SS',
  season: 'Pre',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

export const mockGroupBrand = (overrides = {}) => ({
  id: 'brand-1',
  name: 'Ferragamo',
  code: 'FER',
  sortOrder: 1,
  isActive: true,
  ...overrides,
});

export const mockStore = (overrides = {}) => ({
  id: 'store-1',
  name: 'REX Saigon Centre',
  code: 'REX-SC',
  type: 'REX' as const,
  isActive: true,
  ...overrides,
});

export const mockBudgetDetail = (overrides = {}) => ({
  id: 'detail-1',
  budgetId: 'budget-1',
  storeId: 'store-1',
  store: mockStore(),
  seasonGroup: 'SS',
  season: 'Pre',
  rexAmount: 500000000,
  ttpAmount: 300000000,
  totalAmount: 800000000,
  ...overrides,
});

export const mockPlanningVersion = (overrides = {}) => ({
  id: 'version-1',
  budgetId: 'budget-1',
  budget: mockBudget(),
  version: 'V1' as const,
  isFinal: false,
  totalPlanned: 800000000,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

export const mockPlanningDetail = (overrides = {}) => ({
  id: 'planning-detail-1',
  planningVersionId: 'version-1',
  collectionId: 'collection-1',
  collection: { id: 'collection-1', name: 'Seasonal', code: 'SEA' },
  genderId: 'gender-1',
  gender: { id: 'gender-1', name: 'Male', code: 'M' },
  categoryId: 'category-1',
  category: { id: 'category-1', name: 'Footwear', code: 'FTW' },
  percentage: 60,
  amount: 480000000,
  ...overrides,
});

export const mockProposal = (overrides = {}) => ({
  id: 'proposal-1',
  budgetId: 'budget-1',
  budget: mockBudget(),
  planningVersionId: 'version-1',
  planningVersion: mockPlanningVersion(),
  status: 'draft' as const,
  totalValue: 500000000,
  totalQuantity: 150,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

export const mockTicket = (overrides = {}) => ({
  id: 'ticket-1',
  budgetId: 'budget-1',
  budget: mockBudget(),
  status: 'submitted' as const,
  currentStep: 2,
  submittedBy: 'user-1',
  submittedAt: '2026-01-15T10:00:00Z',
  approvalHistory: [
    {
      step: 1,
      stepName: 'Submitted',
      status: 'approved' as const,
      approverId: 'user-1',
      approverName: 'Admin User',
      timestamp: '2026-01-15T10:00:00Z',
    },
  ],
  createdAt: '2026-01-15T10:00:00Z',
  updatedAt: '2026-01-15T10:00:00Z',
  ...overrides,
});

export const mockAuthResponse = (overrides = {}) => ({
  accessToken: 'mock-jwt-token-12345',
  refreshToken: 'mock-refresh-token-12345',
  user: mockUser(),
  ...overrides,
});

// ─── API Response Mocks ─────────────────────────────────────────

export const mockPaginatedResponse = <T,>(data: T[], total?: number) => ({
  data,
  meta: {
    total: total ?? data.length,
    page: 1,
    pageSize: 20,
    totalPages: Math.ceil((total ?? data.length) / 20),
  },
});

export const mockApiError = (message: string, statusCode = 400) => ({
  message,
  statusCode,
  error: 'Bad Request',
});

// ─── Fetch Mock Helpers ─────────────────────────────────────────

export const mockFetchSuccess = <T,>(data: T) => {
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => data,
  });
};

export const mockFetchError = (message: string, status = 400) => {
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    ok: false,
    status,
    json: async () => mockApiError(message, status),
  });
};

export const mockFetchNetworkError = () => {
  (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
    new Error('Network error')
  );
};

// ─── Custom Render with Providers ───────────────────────────────

interface WrapperProps {
  children: ReactNode;
}

// Basic wrapper - no providers (for unit tests that mock everything)
const AllTheProviders = ({ children }: WrapperProps) => {
  return <>{children}</>;
};

// Full wrapper with providers (for integration tests)
const AllTheProvidersWithContext = ({ children }: WrapperProps) => {
  return (
    <LanguageProvider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </LanguageProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

const customRenderWithProviders = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProvidersWithContext, ...options });

// renderHook wrapper for testing hooks
const customRenderHook = <TResult, TProps>(
  hook: (props: TProps) => TResult,
  options?: Omit<RenderHookOptions<TProps>, 'wrapper'>
) => rtlRenderHook(hook, { wrapper: AllTheProviders, ...options });

const customRenderHookWithProviders = <TResult, TProps>(
  hook: (props: TProps) => TResult,
  options?: Omit<RenderHookOptions<TProps>, 'wrapper'>
) => rtlRenderHook(hook, { wrapper: AllTheProvidersWithContext, ...options });

export * from '@testing-library/react';
export { customRender as render };
export { customRenderWithProviders as renderWithProviders };
export { customRenderHook as renderHook };
export { customRenderHookWithProviders as renderHookWithProviders };

// ─── Wait Helpers ───────────────────────────────────────────────

export const waitForLoadingToFinish = () =>
  new Promise((resolve) => setTimeout(resolve, 0));

export const flushPromises = () =>
  new Promise((resolve) => setTimeout(resolve, 0));
