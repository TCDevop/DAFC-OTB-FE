export const ROUTE_MAP = {
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
  'approval-config': '/approval-config',
  'approvals': '/approvals',
  'order-confirmation': '/order-confirmation',
  'receipt-confirmation': '/receipt-confirmation',
};

const PATHNAME_TO_SCREEN = {
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
  '/approvals': 'approvals',
  '/order-confirmation': 'order-confirmation',
  '/receipt-confirmation': 'receipt-confirmation',
};

export const getScreenIdFromPathname = (pathname) => {
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
