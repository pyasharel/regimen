import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { calculateCycleStatus } from './cycleUtils';

describe('cycleUtils', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null when cycleDaysOn is null', () => {
    expect(calculateCycleStatus('2025-01-01', null, 7)).toBe(null);
  });

  it('returns null for invalid startDate', () => {
    expect(calculateCycleStatus('', 7, 7)).toBe(null);
    expect(calculateCycleStatus('invalid', 7, 7)).toBe(null);
  });

  it('one-time duration (no off period): in cycle', () => {
    const result = calculateCycleStatus('2025-06-01', 30, null);
    expect(result).not.toBe(null);
    expect(result!.isInCycle).toBe(true);
    expect(result!.currentPhase).toBe('on');
    expect(result!.totalDaysInPhase).toBe(30);
  });

  it('one-time duration: past end returns isInCycle false', () => {
    vi.setSystemTime(new Date('2025-08-01'));
    const result = calculateCycleStatus('2025-06-01', 30, null);
    expect(result).not.toBe(null);
    expect(result!.isInCycle).toBe(false);
  });

  it('recurring cycle: on phase', () => {
    vi.setSystemTime(new Date(2025, 5, 5)); // June 5 = day 4 of cycle (on phase)
    const result = calculateCycleStatus('2025-06-01', 7, 7);
    expect(result).not.toBe(null);
    expect(result!.isInCycle).toBe(true);
    expect(result!.currentPhase).toBe('on');
    expect(result!.totalDaysInPhase).toBe(7);
  });

  it('recurring cycle: off phase', () => {
    vi.setSystemTime(new Date(2025, 5, 10)); // June 10 = day 9 of cycle (off phase)
    const result = calculateCycleStatus('2025-06-01', 7, 7);
    expect(result).not.toBe(null);
    expect(result!.isInCycle).toBe(false);
    expect(result!.currentPhase).toBe('off');
  });

  it('cycleDaysOff 0 treated as one-time', () => {
    const result = calculateCycleStatus('2025-06-01', 14, 0);
    expect(result).not.toBe(null);
    expect(result!.currentPhase).toBe('on');
  });
});
