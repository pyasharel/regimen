/**
 * Wraps a promise with a timeout. If the promise doesn't resolve/reject
 * within the specified milliseconds, the returned promise rejects with a
 * TimeoutError containing a descriptive label.
 *
 * This does NOT abort the underlying fetch or operation; it only prevents
 * the UI from waiting indefinitely.
 */

export class TimeoutError extends Error {
  readonly label: string;
  readonly timeoutMs: number;

  constructor(label: string, timeoutMs: number) {
    super(`Timeout: ${label} (${timeoutMs}ms)`);
    this.name = 'TimeoutError';
    this.label = label;
    this.timeoutMs = timeoutMs;
  }
}

export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new TimeoutError(label, ms));
    }, ms);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

/**
 * Wraps a Supabase query (PostgrestBuilder or similar thenable) with a timeout.
 * Supabase queries are "thenable" but not standard Promises, so we wrap the
 * execution in a proper Promise.
 * 
 * Default is 8 seconds which should be plenty for normal network conditions.
 */
export function withQueryTimeout<T>(
  query: PromiseLike<T>,
  label: string,
  ms: number = 8000
): Promise<T> {
  // Wrap the Supabase query in a proper Promise
  const promisified = Promise.resolve(query);
  return withTimeout(promisified, ms, label);
}
