export const ROUTE_MAP: Record<string, string> = {
  'home': '/',
  'budget-management': '/budget-management',
  'planning': '/planning',
  'otb-analysis': '/otb-analysis',
  'proposal': '/proposal',
  'tickets': '/tickets',
  'ticket-detail': '/tickets', // detail uses /tickets/[id]
  'dev-ticket': '/dev-tickets',
  'profile': '/profile',
  'settings': '/settings',
  'master-brands': '/master-data/brands',
  'master-skus': '/master-data/skus',
  'master-categories': '/master-data/categories',
  'master-subcategories': '/master-data/subcategories',
  'master-stores': '/master-data/stores',
  'master-genders': '/master-data/genders',
  'master-season-groups': '/master-data/season-groups',
  'approval-config': '/approval-config',
  'approvals': '/tickets',
  'order-confirmation': '/order-confirmation',
  'receipt-confirmation': '/receipt-confirmation',
  'import-data': '/import-data',
};

const PATHNAME_TO_SCREEN: Record<string, string> = {
  '/': 'home',
  '/budget-management': 'budget-management',
  '/planning': 'planning',
  '/otb-analysis': 'otb-analysis',
  '/proposal': 'proposal',
  '/tickets': 'tickets',
  '/dev-tickets': 'dev-ticket',
  '/profile': 'profile',
  '/settings': 'settings',
  '/approval-config': 'approval-config',
  '/approvals': 'tickets',
  '/order-confirmation': 'order-confirmation',
  '/receipt-confirmation': 'receipt-confirmation',
  '/import-data': 'import-data',
};

export const getScreenIdFromPathname = (pathname: string): string => {
  // Exact match
  if (PATHNAME_TO_SCREEN[pathname]) {
    return PATHNAME_TO_SCREEN[pathname];
  }

  // Master data dynamic route
  if (pathname.startsWith('/master-data/')) {
    const type = pathname.split('/')[2];
    return `master-${type}`;
  }

  // Detail pages
  if (pathname.startsWith('/tickets/')) return 'ticket-detail';
  if (pathname.startsWith('/planning/')) return 'planning-detail';
  if (pathname.startsWith('/proposal/')) return 'proposal-detail';

  return 'home';
};
