import { describe, it, expect } from 'vitest';
import { pluralizeDoseUnit, formatDose, formatLevel } from './doseUtils';

describe('doseUtils', () => {
  describe('pluralizeDoseUnit', () => {
    it('does not pluralize mcg, mg, iu, ml', () => {
      expect(pluralizeDoseUnit(2, 'mcg')).toBe('mcg');
      expect(pluralizeDoseUnit(2, 'mg')).toBe('mg');
      expect(pluralizeDoseUnit(2, 'iu')).toBe('iu');
      expect(pluralizeDoseUnit(2, 'ml')).toBe('ml');
      expect(pluralizeDoseUnit(2, 'IU')).toBe('IU');
    });

    it('returns singular for amount 1', () => {
      expect(pluralizeDoseUnit(1, 'pill')).toBe('pill');
      expect(pluralizeDoseUnit(1, 'capsule')).toBe('capsule');
    });

    it('pluralizes by adding s for amount !== 1', () => {
      expect(pluralizeDoseUnit(2, 'pill')).toBe('pills');
      expect(pluralizeDoseUnit(0, 'capsule')).toBe('capsules');
    });
  });

  describe('formatDose', () => {
    it('formats amount and unit', () => {
      expect(formatDose(2, 'pill')).toBe('2 pills');
      expect(formatDose(250, 'mcg')).toBe('250 mcg');
      expect(formatDose(1, 'ml')).toBe('1 ml');
    });
  });

  describe('formatLevel', () => {
    it('rounds to whole number for level >= 1', () => {
      expect(formatLevel(304.33)).toBe('304');
      expect(formatLevel(1)).toBe('1');
      expect(formatLevel(1.9)).toBe('2');
    });

    it('keeps 2 decimals for level < 1', () => {
      expect(formatLevel(0.25)).toBe('0.25');
      expect(formatLevel(0.5)).toBe('0.50');
      expect(formatLevel(0.123)).toBe('0.12');
    });
  });
});
