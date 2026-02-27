import { describe, it, expect } from 'vitest';
import { getScreenIdFromPathname } from './routeMap';

describe('routeMap', () => {
    describe('getScreenIdFromPathname', () => {
        it('returns correct screen ID for exact matches', () => {
            expect(getScreenIdFromPathname('/')).toBe('home');
            expect(getScreenIdFromPathname('/budget-management')).toBe('budget-management');
            expect(getScreenIdFromPathname('/settings')).toBe('settings');
        });

        it('returns home for unknown routes', () => {
            expect(getScreenIdFromPathname('/unknown/route')).toBe('home');
        });

        it('handles master data dynamic routes', () => {
            expect(getScreenIdFromPathname('/master-data/brands')).toBe('master-brands');
            expect(getScreenIdFromPathname('/master-data/skus')).toBe('master-skus');
        });

        it('handles detail pages', () => {
            expect(getScreenIdFromPathname('/tickets/123')).toBe('ticket-detail');
            expect(getScreenIdFromPathname('/planning/pln-001')).toBe('planning-detail');
            expect(getScreenIdFromPathname('/proposal/prp-001')).toBe('proposal-detail');
        });
    });
});
