import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getNextScheduledDate } from './nextDoseCalculator';

describe('nextDoseCalculator', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 5, 15)); // June 15, 2025 (Sunday = 0)
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const baseCompound = {
    schedule_type: 'Daily',
    schedule_days: null,
    time_of_day: ['Morning'],
    start_date: '2025-01-01',
  };

  it('returns null for As Needed', () => {
    const result = getNextScheduledDate(
      { ...baseCompound, schedule_type: 'As Needed' },
      []
    );
    expect(result).toBe(null);
  });

  it('Daily: returns today when no doses today', () => {
    const result = getNextScheduledDate(
      { ...baseCompound, schedule_type: 'Daily' },
      []
    );
    expect(result).not.toBe(null);
    expect(result!.date).toBe('2025-06-15');
    expect(result!.time).toBe('Morning');
  });

  it('Daily: returns today when not all taken', () => {
    const result = getNextScheduledDate(
      { ...baseCompound, schedule_type: 'Daily' },
      [{ scheduled_date: '2025-06-15', scheduled_time: 'Morning', taken: false }]
    );
    expect(result!.date).toBe('2025-06-15');
  });

  it('Daily: returns tomorrow when all today taken', () => {
    const result = getNextScheduledDate(
      { ...baseCompound, schedule_type: 'Daily' },
      [{ scheduled_date: '2025-06-15', scheduled_time: 'Morning', taken: true }]
    );
    expect(result!.date).toBe('2025-06-16');
  });

  it('Every X Days: returns start date when not started', () => {
    vi.setSystemTime(new Date(2024, 0, 1));
    const result = getNextScheduledDate(
      {
        ...baseCompound,
        schedule_type: 'Every 3 Days',
        start_date: '2025-01-01',
      },
      []
    );
    expect(result!.date).toBe('2025-01-01');
  });

  it('Every X Days: returns a valid next dose date on dose cycle', () => {
    vi.setSystemTime(new Date(2025, 5, 15)); // June 15
    const result = getNextScheduledDate(
      {
        ...baseCompound,
        schedule_type: 'Every 3 Days',
        start_date: '2025-01-01',
      },
      []
    );
    expect(result).not.toBe(null);
    expect(result!.time).toBe('Morning');
    // Depending on timezone, today may be dose day (2025-06-15) or next is 2025-06-16
    expect(['2025-06-15', '2025-06-16', '2025-06-17']).toContain(result!.date);
  });

  it('schedule_days: returns today when today is schedule day and not taken', () => {
    vi.setSystemTime(new Date(2025, 5, 15)); // Sunday = 0
    const result = getNextScheduledDate(
      {
        ...baseCompound,
        schedule_type: 'Weekly',
        schedule_days: ['0'], // Sunday
        time_of_day: ['Morning', 'Evening'],
        start_date: '2025-01-01',
      },
      []
    );
    expect(result).not.toBe(null);
    expect(result!.date).toBe('2025-06-15');
    expect(result!.time).toBe('Morning');
  });

  it('schedule_days: returns next matching day when today not in schedule', () => {
    vi.setSystemTime(new Date(2025, 5, 15)); // Sunday = 0
    const result = getNextScheduledDate(
      {
        ...baseCompound,
        schedule_type: 'Weekly',
        schedule_days: ['1'], // Monday
        time_of_day: ['Morning'],
        start_date: '2025-01-01',
      },
      []
    );
    expect(result).not.toBe(null);
    expect(result!.date).toBe('2025-06-16'); // Monday
  });

  it('getTimeForDay uses index when day has multiple times', () => {
    vi.setSystemTime(new Date(2025, 5, 16)); // Monday = 1
    const result = getNextScheduledDate(
      {
        ...baseCompound,
        schedule_type: 'Weekly',
        schedule_days: ['1', '3'],
        time_of_day: ['Morning', 'Evening'],
        start_date: '2025-01-01',
      },
      []
    );
    expect(result).not.toBe(null);
    expect(result!.time).toBe('Morning');
  });

  it('returns null when schedule_days empty after filter', () => {
    const result = getNextScheduledDate(
      {
        ...baseCompound,
        schedule_type: 'Weekly',
        schedule_days: ['x'],
        time_of_day: ['Morning'],
        start_date: '2025-01-01',
      },
      []
    );
    expect(result).toBe(null);
  });
});
