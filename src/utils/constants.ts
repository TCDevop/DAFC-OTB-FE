// Master Data Constants

export const GROUP_BRANDS = [
  { id: '1', code: 'FER', name: 'Ferragamo', color: 'from-rose-400 to-rose-600' },
  { id: '2', code: 'BUR', name: 'Burberry', color: 'from-amber-400 to-amber-600' },
  { id: '3', code: 'GUC', name: 'Gucci', color: 'from-emerald-400 to-emerald-600' },
  { id: '4', code: 'PRA', name: 'Prada', color: 'from-purple-400 to-purple-600' }
];

export const STORES = [
  { id: 'rex', code: 'REX', name: 'REX' },
  { id: 'ttp', code: 'TTP', name: 'TTP' },
  { id: 'rex-dn', code: 'REX-DN', name: 'REX-DN' },
  { id: 'ttp-hp', code: 'TTP-HP', name: 'TTP-HP' },
  { id: 'online-vn', code: 'ONLINE-VN', name: 'ONLINE-VN' }
];

export const COLLECTIONS = [
  { id: 'col1', name: 'Carry Over' },
  { id: 'col2', name: 'Seasonal' }
];

export const GENDERS = [
  { id: 'gen1', name: 'Male' },
  { id: 'gen2', name: 'Female' }
];

export const CATEGORIES = [
  { id: 'women_rtw', name: "Women's RTW", genderId: 'gen2' },
  { id: 'women_hard_acc', name: "Women's Hard Accessories", genderId: 'gen2' },
  { id: 'men_rtw', name: "Men's RTW", genderId: 'gen1' },
  { id: 'men_hard_acc', name: "Men's Hard Accessories", genderId: 'gen1' }
];

export const SUB_CATEGORIES = [
  { id: 'w_outerwear', name: 'W Outerwear', categoryId: 'women_rtw' },
  { id: 'w_tailoring', name: 'W Tailoring', categoryId: 'women_rtw' },
  { id: 'w_tops', name: 'W Tops', categoryId: 'women_rtw' },
  { id: 'w_bags', name: 'W Bags', categoryId: 'women_hard_acc' },
  { id: 'm_outerwear', name: 'M Outerwear', categoryId: 'men_rtw' },
  { id: 'm_tailoring', name: 'M Tailoring', categoryId: 'men_rtw' },
  { id: 'm_tops', name: 'M Tops', categoryId: 'men_rtw' },
  { id: 'm_bags', name: 'M Bags', categoryId: 'men_hard_acc' }
];

export const CURRENT_YEAR = new Date().getFullYear();
