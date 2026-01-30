

## Fix: Recreate Supabase Client on iOS Cold Start

### The Problem (Confirmed via Web Inspector)

After a hard close on iOS, the Supabase client gets into a broken state where **all auth operations time out**:
- `getSession` → 4000ms timeout
- `setSession` → 2000ms timeout  
- Token mirror restore → 2500ms timeout
- Verification → 1500ms timeout
- **Total: 10+ seconds of wasted time, then all data queries fail**

The root cause: When iOS force-kills the app, the WebView terminates mid-operation. On the next cold start, the Supabase client singleton (created once at module load) has corrupted internal state (pending promises, stale network connections, locked auth state). No amount of retry logic helps because we're calling methods on a **broken instance**.

### The Solution

Implement a **client recreation mechanism** that detects cold start conditions and creates a fresh Supabase client before any auth operations run.

### Technical Approach

**Phase 1: Create Mutable Client Export**

Modify `src/integrations/supabase/client.ts` to use a Proxy pattern that allows the underlying client to be swapped:

```text
┌─────────────────────────────────────────────────────────────┐
│  Before (Current)                                           │
│  export const supabase = createClient(...)  ← IMMUTABLE    │
│                                                             │
│  After (With Recreation)                                    │
│  let instance = createClient(...)                           │
│  export const supabase = Proxy → instance   ← SWAPPABLE    │
│  export const recreateClient = () => { instance = ... }     │
└─────────────────────────────────────────────────────────────┘
```

**Phase 2: Detect Cold Start & Recreate**

In `src/main.tsx`, during the failed-boot detection phase:

```text
if (lastBootStatus === 'STARTING') {
  // Previous boot failed - client may be corrupted
  1. Clear suspect localStorage keys (already implemented)
  2. Call recreateSupabaseClient() ← NEW
}
```

**Phase 3: Update authTokenMirror Import**

The `authTokenMirror.ts` file imports `supabase` directly. With the Proxy pattern, it will automatically use the recreated instance.

### File Changes

| File | Change |
|------|--------|
| `src/integrations/supabase/client.ts` | Add Proxy wrapper and `recreateSupabaseClient()` export |
| `src/main.tsx` | Import and call `recreateSupabaseClient()` on failed boot detection |
| `src/utils/safeAuth.ts` | No changes needed - imports will automatically use new instance |
| `src/utils/authTokenMirror.ts` | No changes needed - imports will automatically use new instance |

### Implementation Details

**client.ts changes:**
```typescript
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const clientOptions = {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
};

// Mutable client instance
let supabaseInstance: SupabaseClient<Database> = createClient<Database>(
  SUPABASE_URL, 
  SUPABASE_PUBLISHABLE_KEY, 
  clientOptions
);

/**
 * Recreate the Supabase client with a fresh instance.
 * Call this on cold start after failed boot detection to clear
 * any corrupted internal state from iOS hard-close.
 */
export const recreateSupabaseClient = (): SupabaseClient<Database> => {
  console.log('[SupabaseClient] Recreating client instance for fresh start');
  supabaseInstance = createClient<Database>(
    SUPABASE_URL, 
    SUPABASE_PUBLISHABLE_KEY, 
    clientOptions
  );
  return supabaseInstance;
};

/**
 * Proxy that forwards all property access to the current instance.
 * This allows the underlying client to be swapped without breaking imports.
 */
export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get: (_, prop: keyof SupabaseClient<Database>) => {
    return supabaseInstance[prop];
  },
});
```

**main.tsx addition:**
```typescript
// At top of failed boot detection block (around line 13)
import { recreateSupabaseClient } from './integrations/supabase/client';

if (lastBootStatus === 'STARTING') {
  console.warn('[BOOT] Previous boot failed. Clearing suspect keys and recreating client.');
  
  // ... existing key clearing code ...
  
  // Recreate Supabase client to clear corrupted state
  recreateSupabaseClient();
}
```

### Why This Works

1. **Fresh internal state**: A new `createClient()` call gets fresh network connections, empty promise queues, and an unlocked auth state
2. **Proxy transparency**: All existing code (`import { supabase } from '...'`) continues to work - the Proxy forwards to the new instance
3. **Targeted fix**: Only triggers on detected failed boot, not on every app start
4. **Preserves tokens**: We still read tokens from localStorage/mirror - we just need a non-corrupted client to use them

### Testing Plan

After implementation:
1. Delete app from iPhone
2. Install fresh, sign in
3. Perform 10+ hard closes (swipe up from app switcher)
4. On each reopen, verify:
   - Data loads within 2-3 seconds (not 10+ seconds of timeouts)
   - No empty state shown
   - Console shows "Recreating client instance" on recoveries

### Risk Assessment

**Low risk** - The Proxy pattern is well-established in JavaScript and the Supabase client is designed to be instantiable multiple times. The change only affects the boot recovery path.

