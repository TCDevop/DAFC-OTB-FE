import { describe, it, expect } from 'vitest';
import { formatCurrency, generateSeasons } from './formatters';

describe('formatters', () => {
    describe('formatCurrency', () => {
        it('formats VND correctly for large numbers', () => {
            // 10 billion
            expect(formatCurrency(10_000_000_000)).toBe('10 tỷ');
            // 2.5 billion
            expect(formatCurrency(2_500_000_000)).toBe('2.5 tỷ');
        });

        it('formats VND correctly for millions', () => {
            // 500 million
            expect(formatCurrency(500_000_000)).toBe('500 tr');
        });

        it('formats VND correctly for thousands', () => {
            // 500k
            expect(formatCurrency(500_000)).toBe('500K đ');
        });

        it('formats small numbers correctly', () => {
            // 100
            expect(formatCurrency(100)).toBe('100 đ');
        });

        it('formats USD correctly when requested', () => {
            // 25,000 VND = 1 USD
            expect(formatCurrency(25_000, { currency: 'USD' })).toBe('$1');

            // 25,000,000 VND = 1,000 USD -> $1K
            expect(formatCurrency(25_000_000, { currency: 'USD' })).toBe('$1K');
        });

        it('handles null/undefined/string inputs', () => {
            expect(formatCurrency(null)).toBe('0 đ');
            expect(formatCurrency(undefined)).toBe('0 đ');
            expect(formatCurrency('100000')).toBe('100K đ');
        });
    });

    describe('generateSeasons', () => {
        it('generates Pre and Main seasons', () => {
            const seasons = generateSeasons('SS', 2025);
            expect(seasons).toHaveLength(2);
            expect(seasons[0]).toEqual({
                id: 'SS_pre_2025',
                name: 'Pre',
                fiscalYear: 2025,
                seasonGroupId: 'SS',
                type: 'pre'
            });
            expect(seasons[1]).toEqual({
                id: 'SS_main_2025',
                name: 'Main',
                fiscalYear: 2025,
                seasonGroupId: 'SS',
                type: 'main'
            });
        });
    });
});
