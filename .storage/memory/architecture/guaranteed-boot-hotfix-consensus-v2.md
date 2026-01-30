# Memory: architecture/guaranteed-boot-hotfix-consensus-v2
Updated: just now

The "Guaranteed Boot Hotfix" addresses the black screen on cold start by eliminating the suspected causes of deadlocks and "poison data." This includes: disabling eager persistentStorage migration, implementing failed boot detection to clear suspect keys, making splash screen auth non-blocking with a 3-second hard timeout, reducing the global boot timeout to 4 seconds, and adding a visible boot-stage indicator for diagnostics. Final release is v1.0.3 (Build 19).

## Additional Fix (v1.0.3+)

Cold start from notification now correctly ensures Supabase client session hydration before running data queries in TodayScreen. Previously, cached userId was available but Supabase client wasn't authenticated, causing RLS to return empty results and triggering "Slow connection" toasts.

## Android Notifications Fix

Added missing `ic_stat_icon_config_sample.xml` vector drawable to `android/app/src/main/res/drawable/`. Android notifications silently fail without this icon resource.
