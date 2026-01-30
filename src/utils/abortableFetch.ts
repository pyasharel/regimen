/**
 * Abortable Fetch Utility
 * 
 * Creates a fetch wrapper that:
 * 1. Automatically aborts requests after a timeout
 * 2. Tracks all active controllers in a registry
 * 3. Allows bulk abort of all inflight requests
 * 
 * This is critical for iOS where stuck requests from app suspension
 * can accumulate and poison the networking stack.
 */

interface AbortableFetchOptions {
  /** Default timeout in milliseconds for all requests */
  defaultTimeoutMs: number;
  /** Tag for logging purposes */
  tag: string;
}

interface AbortableFetchInstance {
  /** The fetch function with abort capability */
  fetch: typeof fetch;
  /** Abort all currently inflight requests */
  abortAll: () => number;
  /** Get count of active requests */
  getActiveCount: () => number;
}

export function createAbortableFetch(options: AbortableFetchOptions): AbortableFetchInstance {
  const { defaultTimeoutMs, tag } = options;
  
  // Registry of active abort controllers
  const activeControllers = new Set<AbortController>();
  
  const abortableFetch: typeof fetch = async (input, init) => {
    const controller = new AbortController();
    activeControllers.add(controller);
    
    // Extract URL for logging
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const urlPath = new URL(url).pathname;
    
    // Set up timeout to abort the request
    const timeoutId = setTimeout(() => {
      console.warn(`[${tag}] ⏰ ABORTING request after ${defaultTimeoutMs}ms: ${urlPath}`);
      controller.abort();
    }, defaultTimeoutMs);
    
    try {
      const response = await fetch(input, {
        ...init,
        signal: controller.signal,
      });
      
      return response;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log(`[${tag}] Request aborted: ${urlPath}`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
      activeControllers.delete(controller);
    }
  };
  
  const abortAll = (): number => {
    const count = activeControllers.size;
    if (count > 0) {
      console.log(`[${tag}] 🛑 Aborting ${count} inflight requests`);
      activeControllers.forEach(controller => {
        try {
          controller.abort();
        } catch {
          // Ignore errors from already aborted controllers
        }
      });
      activeControllers.clear();
    }
    return count;
  };
  
  const getActiveCount = (): number => activeControllers.size;
  
  return {
    fetch: abortableFetch,
    abortAll,
    getActiveCount,
  };
}
