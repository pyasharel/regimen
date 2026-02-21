import { describe, it, expect, vi, afterEach } from 'vitest';
import { withTimeout, withQueryTimeout, TimeoutError } from './withTimeout';

describe('withTimeout', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves when promise resolves before timeout', async () => {
    const result = await withTimeout(Promise.resolve(42), 1000, 'test');
    expect(result).toBe(42);
  });

  it('rejects with TimeoutError when promise exceeds timeout', async () => {
    vi.useFakeTimers();
    const promise = withTimeout(
      new Promise<number>(() => {}),
      100,
      'slow-op'
    );
    vi.advanceTimersByTime(150);
    await expect(promise).rejects.toThrow(TimeoutError);
    await expect(promise).rejects.toMatchObject({ label: 'slow-op', timeoutMs: 100 });
  });

  it('rejects with inner error when promise rejects before timeout', async () => {
    await expect(
      withTimeout(Promise.reject(new Error('fail')), 1000, 'test')
    ).rejects.toThrow('fail');
  });
});

describe('TimeoutError', () => {
  it('has name, label, and timeoutMs', () => {
    const err = new TimeoutError('label', 500);
    expect(err.name).toBe('TimeoutError');
    expect(err.label).toBe('label');
    expect(err.timeoutMs).toBe(500);
    expect(err.message).toContain('500');
  });
});

describe('withQueryTimeout', () => {
  it('resolves when query resolves', async () => {
    const result = await withQueryTimeout(Promise.resolve(99), 'query');
    expect(result).toBe(99);
  });

  it('uses default 8000ms timeout', async () => {
    vi.useFakeTimers();
    const promise = withQueryTimeout(
      new Promise<number>(() => {}),
      'query'
    );
    vi.advanceTimersByTime(8500);
    await expect(promise).rejects.toThrow(TimeoutError);
  });
});
