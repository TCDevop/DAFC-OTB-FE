// src/test/mock-services.ts
// Centralized mock data + service mocks for hook/service tests

import { vi } from 'vitest';

// ─── Mock Master Data ──────────────────────────────────────────

export const mockBrands = [
  { id: 'brand-1', code: 'FER', name: 'Ferragamo', sortOrder: 1, isActive: true },
  { id: 'brand-2', code: 'BUR', name: 'Burberry', sortOrder: 2, isActive: true },
];

export const mockStores = [
  { id: 'store-rex', code: 'REX', name: 'REX', isActive: true },
  { id: 'store-ttp', code: 'TTP', name: 'TTP', isActive: true },
];

export const mockCollections = [
  { id: 'col-1', code: 'CO', name: 'Carry Over' },
  { id: 'col-2', code: 'SEA', name: 'Seasonal' },
];

export const mockGenders = [
  { id: 'gen-1', code: 'M', name: 'Male' },
  { id: 'gen-2', code: 'F', name: 'Female' },
];

export const mockCategories = [
  { id: 'cat-1', code: 'WRTW', name: "Women's RTW", subCategories: [{ id: 'sub-1', name: 'W Outerwear' }] },
  { id: 'cat-2', code: 'MRTW', name: "Men's RTW", subCategories: [{ id: 'sub-2', name: 'M Outerwear' }] },
];

export const mockSeasons = [
  { id: 'ss', code: 'SS', name: 'Spring Summer' },
  { id: 'fw', code: 'FW', name: 'Fall Winter' },
];

// ─── Mock API Budget Data ──────────────────────────────────────

export const mockApiBudget = (overrides: any = {}) => ({
  id: 'budget-1',
  budgetCode: 'BUD-FER-SS-2025',
  groupBrandId: 'brand-1',
  groupBrand: { name: 'Ferragamo' },
  seasonGroupId: 'SS',
  seasonType: 'Pre',
  fiscalYear: 2025,
  totalBudget: '1000000000',
  comment: 'Test budget',
  status: 'DRAFT',
  details: [
    {
      id: 'detail-1',
      storeId: 'store-rex',
      store: { name: 'REX', code: 'REX' },
      budgetAmount: '600000000',
    },
    {
      id: 'detail-2',
      storeId: 'store-ttp',
      store: { name: 'TTP', code: 'TTP' },
      budgetAmount: '400000000',
    },
  ],
  createdAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

// ─── Mock API Planning Data ────────────────────────────────────

export const mockApiPlanning = (overrides: any = {}) => ({
  id: 'planning-1',
  planningCode: 'PLN-001',
  budgetDetailId: 'detail-1',
  versionName: 'Version 1',
  versionNumber: 1,
  status: 'DRAFT',
  isFinal: false,
  details: [
    {
      id: 'pd-1',
      dimensionType: 'collection',
      collectionId: 'col-1',
      collection: { name: 'Carry Over' },
      genderId: null,
      gender: null,
      categoryId: null,
      category: null,
      lastSeasonSales: '500000000',
      lastSeasonPct: '0.5',
      systemBuyPct: '0.5',
      userBuyPct: '0.5',
      otbValue: '500000000',
      userComment: '',
      variancePct: '0',
    },
  ],
  budgetDetail: { id: 'detail-1', budgetAmount: '1000000000' },
  createdAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

// ─── Mock API Proposal Data ───────────────────────────────────

export const mockApiProposal = (overrides: any = {}) => ({
  id: 'proposal-1',
  ticketName: 'PROP-001',
  budgetId: 'budget-1',
  planningVersionId: 'planning-1',
  status: 'DRAFT',
  totalSkuCount: 5,
  totalOrderQty: 100,
  totalValue: '500000000',
  products: [
    {
      id: 'prod-1',
      skuId: 'sku-1',
      skuCode: 'SKU-001',
      productName: 'Test Product',
      collection: 'Seasonal',
      gender: 'Female',
      category: "Women's RTW",
      subCategory: 'W Outerwear',
      theme: 'Classic',
      color: 'Black',
      unitCost: '500000',
      srp: '1000000',
      orderQty: 20,
      totalValue: '10000000',
      customerTarget: 'VIP',
      imageUrl: null,
    },
  ],
  budget: { id: 'budget-1', budgetCode: 'BUD-FER-SS-2025' },
  planningVersion: { id: 'planning-1', versionName: 'Version 1' },
  createdAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

// ─── Mock SKU Catalog ──────────────────────────────────────────

export const mockSkuCatalog = [
  {
    id: 'sku-1',
    skuCode: 'SKU-001',
    productName: 'Test Product',
    collection: 'Seasonal',
    gender: 'Female',
    unitCost: 500000,
    srp: 1000000,
  },
  {
    id: 'sku-2',
    skuCode: 'SKU-002',
    productName: 'Test Product 2',
    collection: 'Carry Over',
    gender: 'Male',
    unitCost: 300000,
    srp: 600000,
  },
];

// ─── Create Mock Service Factories ────────────────────────────

export const createMockBudgetService = () => ({
  getAll: vi.fn().mockResolvedValue({ data: [mockApiBudget()] }),
  getOne: vi.fn().mockResolvedValue(mockApiBudget()),
  getStatistics: vi.fn().mockResolvedValue({ total: 1, draft: 1 }),
  create: vi.fn().mockResolvedValue(mockApiBudget()),
  update: vi.fn().mockResolvedValue(mockApiBudget()),
  submit: vi.fn().mockResolvedValue(mockApiBudget({ status: 'SUBMITTED' })),
  approveL1: vi.fn().mockResolvedValue(mockApiBudget({ status: 'LEVEL1_APPROVED' })),
  approveL2: vi.fn().mockResolvedValue(mockApiBudget({ status: 'APPROVED' })),
  rejectL1: vi.fn().mockResolvedValue(mockApiBudget({ status: 'REJECTED' })),
  rejectL2: vi.fn().mockResolvedValue(mockApiBudget({ status: 'REJECTED' })),
  delete: vi.fn().mockResolvedValue({ success: true }),
});

export const createMockPlanningService = () => ({
  getAll: vi.fn().mockResolvedValue({ data: [mockApiPlanning()] }),
  getOne: vi.fn().mockResolvedValue({ data: mockApiPlanning() }),
  create: vi.fn().mockResolvedValue(mockApiPlanning()),
  update: vi.fn().mockResolvedValue(mockApiPlanning()),
  updateDetail: vi.fn().mockResolvedValue({}),
  copy: vi.fn().mockResolvedValue(mockApiPlanning({ versionNumber: 2 })),
  submit: vi.fn().mockResolvedValue(mockApiPlanning({ status: 'SUBMITTED' })),
  approveL1: vi.fn().mockResolvedValue(mockApiPlanning({ status: 'LEVEL1_APPROVED' })),
  approveL2: vi.fn().mockResolvedValue(mockApiPlanning({ status: 'APPROVED' })),
  rejectL1: vi.fn().mockResolvedValue(mockApiPlanning({ status: 'REJECTED' })),
  rejectL2: vi.fn().mockResolvedValue(mockApiPlanning({ status: 'REJECTED' })),
  finalize: vi.fn().mockResolvedValue(mockApiPlanning({ isFinal: true })),
  delete: vi.fn().mockResolvedValue({ success: true }),
});

export const createMockProposalService = () => ({
  getAll: vi.fn().mockResolvedValue({ data: [mockApiProposal()] }),
  getOne: vi.fn().mockResolvedValue(mockApiProposal()),
  getStatistics: vi.fn().mockResolvedValue({ total: 1 }),
  create: vi.fn().mockResolvedValue(mockApiProposal()),
  update: vi.fn().mockResolvedValue(mockApiProposal()),
  addProduct: vi.fn().mockResolvedValue({}),
  bulkAddProducts: vi.fn().mockResolvedValue({}),
  updateProduct: vi.fn().mockResolvedValue({}),
  removeProduct: vi.fn().mockResolvedValue({}),
  submit: vi.fn().mockResolvedValue(mockApiProposal({ status: 'SUBMITTED' })),
  approveL1: vi.fn().mockResolvedValue(mockApiProposal({ status: 'LEVEL1_APPROVED' })),
  approveL2: vi.fn().mockResolvedValue(mockApiProposal({ status: 'APPROVED' })),
  rejectL1: vi.fn().mockResolvedValue(mockApiProposal({ status: 'REJECTED' })),
  rejectL2: vi.fn().mockResolvedValue(mockApiProposal({ status: 'REJECTED' })),
  delete: vi.fn().mockResolvedValue({ success: true }),
});

export const createMockMasterDataService = () => ({
  getBrands: vi.fn().mockResolvedValue(mockBrands),
  getStores: vi.fn().mockResolvedValue(mockStores),
  getCollections: vi.fn().mockResolvedValue(mockCollections),
  getGenders: vi.fn().mockResolvedValue(mockGenders),
  getCategories: vi.fn().mockResolvedValue(mockCategories),
  getSeasons: vi.fn().mockResolvedValue(mockSeasons),
  getSkuCatalog: vi.fn().mockResolvedValue({ data: mockSkuCatalog }),
  getSubCategories: vi.fn().mockResolvedValue([]),
});

export const createMockAuthService = () => ({
  login: vi.fn().mockResolvedValue({
    accessToken: 'mock-token',
    refreshToken: 'mock-refresh',
    user: { id: 'user-1', email: 'admin@dafc.com', name: 'Admin', role: 'admin', permissions: ['*'] },
  }),
  logout: vi.fn(),
  getProfile: vi.fn().mockResolvedValue({
    id: 'user-1', email: 'admin@dafc.com', name: 'Admin', role: 'admin', permissions: ['*'],
  }),
  refresh: vi.fn().mockResolvedValue({ accessToken: 'new-token', refreshToken: 'new-refresh' }),
  isAuthenticated: vi.fn().mockReturnValue(true),
  getToken: vi.fn().mockReturnValue('mock-token'),
});
