// Master Data Constants

export const SEASON_GROUPS = ['SS', 'FW'];

export const GROUP_BRANDS = [
  { id: '1', code: 'FER', name: 'Ferragamo', color: 'from-rose-400 to-rose-600' },
  { id: '2', code: 'BUR', name: 'Burberry', color: 'from-amber-400 to-amber-600' },
  { id: '3', code: 'GUC', name: 'Gucci', color: 'from-emerald-400 to-emerald-600' },
  { id: '4', code: 'PRA', name: 'Prada', color: 'from-purple-400 to-purple-600' }
];

export const STORES = [
  { id: 'rex', code: 'REX', name: 'REX' },
  { id: 'ttp', code: 'TTP', name: 'TTP' }
];

export const SEASON_CONFIG = {
  SS: { name: 'Spring Summer', subSeasons: ['Pre', 'Main/Show'] },
  FW: { name: 'Fall Winter', subSeasons: ['Pre', 'Main/Show'] }
};

export const COLLECTIONS = [
  { id: 'col1', name: 'Spring Elegance' },
  { id: 'col2', name: 'Urban Classic' },
  { id: 'col3', name: 'Summer Breeze' }
];

export const GENDERS = [
  { id: 'gen1', name: 'Male' },
  { id: 'gen2', name: 'Female' }
];

export const CATEGORIES = [
  { id: 'cat1', name: 'Bags', genderId: 'gen2' },
  { id: 'cat2', name: 'Shoes', genderId: 'gen1' },
  { id: 'cat3', name: 'Accessories', genderId: 'gen3' }
];

export const CURRENT_YEAR = 2025;
export const CURRENT_SEASON_GROUP = 'SS';
