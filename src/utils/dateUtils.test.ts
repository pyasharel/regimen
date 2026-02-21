import { describe, it, expect } from 'vitest';
import {
  toLocalDateString,
  safeParseDate,
  safeFormatDate,
  createLocalDate,
  isValidDate,
  formatLocalDate,
} from './dateUtils';

describe('dateUtils', () => {
  describe('toLocalDateString', () => {
    it('returns YYYY-MM-DD for current date when no arg', () => {
      const result = toLocalDateString();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('returns YYYY-MM-DD for given date', () => {
      const date = new Date(2025, 0, 15); // Jan 15, 2025
      expect(toLocalDateString(date)).toBe('2025-01-15');
    });

    it('pads month and day with zero', () => {
      expect(toLocalDateString(new Date(2025, 0, 5))).toBe('2025-01-05');
      expect(toLocalDateString(new Date(2025, 8, 9))).toBe('2025-09-09');
    });
  });

  describe('safeParseDate', () => {
    it('returns null for null and undefined', () => {
      expect(safeParseDate(null)).toBe(null);
      expect(safeParseDate(undefined)).toBe(null);
    });

    it('returns null for invalid date string', () => {
      expect(safeParseDate('')).toBe(null);
      expect(safeParseDate('   ')).toBe(null);
      expect(safeParseDate('null')).toBe(null);
      expect(safeParseDate('undefined')).toBe(null);
    });

    it('parses YYYY-MM-DD string in local timezone', () => {
      const d = safeParseDate('2025-06-15');
      expect(d).not.toBe(null);
      expect((d as Date).getFullYear()).toBe(2025);
      expect((d as Date).getMonth()).toBe(5);
      expect((d as Date).getDate()).toBe(15);
    });

    it('returns null for invalid date string', () => {
      expect(safeParseDate('not-a-date')).toBe(null);
    });

    it('accepts valid Date object', () => {
      const date = new Date(2025, 2, 10);
      const result = safeParseDate(date);
      expect(result).toEqual(date);
    });

    it('returns null for invalid Date object', () => {
      const bad = new Date('invalid');
      expect(safeParseDate(bad)).toBe(null);
    });

    it('uses parseISO for ISO datetime strings', () => {
      const d = safeParseDate('2025-06-15T12:00:00.000Z');
      expect(d).not.toBe(null);
      expect((d as Date).getTime()).toBeDefined();
    });

    it('returns null for unparseable string', () => {
      const d = safeParseDate('not-valid-iso');
      expect(d).toBe(null);
    });
  });

  describe('safeFormatDate', () => {
    it('returns fallback for invalid date', () => {
      expect(safeFormatDate(null, 'MMM d', 'N/A')).toBe('N/A');
      expect(safeFormatDate('', 'MMM d', '--')).toBe('--');
    });

    it('formats valid date', () => {
      const result = safeFormatDate('2025-06-15', 'MMM d, yyyy');
      expect(result).toContain('2025');
    });

    it('uses default fallback N/A', () => {
      expect(safeFormatDate(null, 'MMM d')).toBe('N/A');
    });

  });

  describe('createLocalDate', () => {
    it('returns null for null/undefined/empty', () => {
      expect(createLocalDate(null)).toBe(null);
      expect(createLocalDate(undefined)).toBe(null);
      expect(createLocalDate('')).toBe(null);
    });

    it('parses YYYY-MM-DD to local Date', () => {
      const d = createLocalDate('2025-03-20');
      expect(d).not.toBe(null);
      expect((d as Date).getFullYear()).toBe(2025);
      expect((d as Date).getMonth()).toBe(2);
      expect((d as Date).getDate()).toBe(20);
    });

    it('returns null for invalid parts', () => {
      expect(createLocalDate('2025-')).toBe(null);
      expect(createLocalDate('invalid')).toBe(null);
    });

    it('returns null when date is invalid after parsing', () => {
      expect(createLocalDate('2025-00-01')).toBe(null);
    });
  });

  describe('isValidDate', () => {
    it('returns true for valid date string', () => {
      expect(isValidDate('2025-01-01')).toBe(true);
    });

    it('returns false for invalid input', () => {
      expect(isValidDate(null)).toBe(false);
      expect(isValidDate('')).toBe(false);
      expect(isValidDate('bad')).toBe(false);
    });
  });

  describe('formatLocalDate', () => {
    it('returns fallback for invalid dateStr', () => {
      expect(formatLocalDate(null, 'MMM d')).toBe('N/A');
      expect(formatLocalDate('', 'MMM d', '--')).toBe('--');
    });

    it('formats valid dateStr', () => {
      const result = formatLocalDate('2025-07-04', 'yyyy');
      expect(result).toBe('2025');
    });

  });
});
