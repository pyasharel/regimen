
# v1.0.3 Release (Build 18) - COMPLETE

## Status: ✅ Ready to Ship

All code changes are complete. Ready for native builds.

## Completed Changes

| File | Change | Status |
|------|--------|--------|
| `src/contexts/SubscriptionContext.tsx` | `$countryCode` → `country_code`, watchdog 8s→5s | ✅ Done |
| `src/main.tsx` | Theme bootstrap from Capacitor Preferences | ✅ Done |
| `src/components/MedicationLevelsCard.tsx` | `mt-2` → `mt-3` | ✅ Done |
| `src/components/MedicationLevelsCard.tsx` | Priority swap: recently logged → alphabetical | ✅ Done |
| `.storage/memory/development/v103-cold-start-fixes.md` | Documented all fixes | ✅ Done |

## Remaining Local Setup (Your Machine)

### Android Launcher Icons

1. Open Android Studio → your project
2. Right-click `res` folder → New → Image Asset
3. Select your 1024x1024 icon, generate all densities
4. **Delete** `mipmap-anydpi-v26` folder
5. Build → Clean Project, then rebuild

## Build Commands

**iOS:**
```bash
git pull && npm install && npm run build && npx cap sync ios
cd ios/App && pod install && cd ../..
npx cap open ios
```

**Android:**
```bash
git pull && npm install && npm run build && npx cap sync android
npx cap open android
# Fix icons in Android Studio as described above
```

## Release Notes

- **Version:** 1.0.3
- **Build:** 18
- **Critical fixes:** Cold start data loading, RevenueCat attribute error
- **UX improvements:** Levels Card shows most recently logged medication first
- **Visual fixes:** Theme persistence, dark mode spacing
