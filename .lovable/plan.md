

## Add ANDROID90 Promo Code

A simple backend-only change to add the `ANDROID90` promo code that gives 90 days (3 months) of free premium access. This will help you track Android beta tester redemptions separately from other promo codes.

### Changes Required

**1. Update `validate-promo-code` edge function**
- Add `'ANDROID90': { days: 90, description: '3 months free' }` to the `BACKEND_PROMO_CODES` object

**2. Update `activate-beta-access` edge function**  
- Add `"ANDROID90": { days: 90, description: "3 months beta access" }` to the `PROMO_CODES` object

### What This Enables

- Testers enter `ANDROID90` in the app's promo code field
- The code validates and grants 90 days of premium access
- You can later query your database to see how many users redeemed `ANDROID90` specifically vs `BETATESTER` or other codes

### No App Update Required

This is entirely a backend change. Once deployed (automatic), the code works immediately on all platforms - Android, iOS, and web.

---

### Technical Details

Both edge functions will be updated to recognize the new code:

```text
validate-promo-code/index.ts (line 12-15):
┌─────────────────────────────────────────────────────┐
│ const BACKEND_PROMO_CODES = {                       │
│   'BETATESTER': { days: 90, description: '...' },   │
│   'REDDIT30': { days: 30, description: '...' },     │
│ + 'ANDROID90': { days: 90, description: '...' },    │
│ };                                                  │
└─────────────────────────────────────────────────────┘

activate-beta-access/index.ts (line 10-13):
┌─────────────────────────────────────────────────────┐
│ const PROMO_CODES = {                               │
│   "BETATESTER": { days: 90, description: "..." },   │
│   "REDDIT30": { days: 30, description: "..." },     │
│ + "ANDROID90": { days: 90, description: "..." },    │
│ };                                                  │
└─────────────────────────────────────────────────────┘
```

