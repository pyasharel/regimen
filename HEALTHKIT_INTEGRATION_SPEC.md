# HealthKit & Health Connect Integration Spec

> **Purpose**: This is a complete, step-by-step guide for adding Apple HealthKit (iOS) and Google Health Connect (Android) to the Regimen app. It's written so you can follow it in **Cursor** or **Claude Code** — tools you may be using for the first time.

---

## Table of Contents

1. [Prerequisites & Environment Setup](#1-prerequisites--environment-setup)
2. [Getting Started with Cursor](#2-getting-started-with-cursor)
3. [Getting Started with Claude Code (Alternative)](#3-getting-started-with-claude-code-alternative)
4. [Plugin Installation](#4-plugin-installation)
5. [iOS Configuration (HealthKit)](#5-ios-configuration-healthkit)
6. [Android Configuration (Health Connect)](#6-android-configuration-health-connect)
7. [React Hook Implementation](#7-react-hook-implementation)
8. [UI Integration Points](#8-ui-integration-points)
9. [Testing](#9-testing)
10. [Database Schema](#10-database-schema)
11. [Exact Prompts for Cursor / Claude Code](#11-exact-prompts-for-cursor--claude-code)


---

## Health Metrics Overview

| Metric | Category Key | HealthKit ID | Health Connect Type | Why |
|--------|-------------|--------------|-------------------|-----|
| Weight | `weight` | `bodyMass` | `WeightRecord` | Core metric, already supported |
| Body Fat % | `body_fat` | `bodyFatPercentage` | `BodyFatRecord` | Body recomp tracking |
| Lean Body Mass | `lean_mass` | `leanBodyMass` | `LeanBodyMassRecord` | Muscle growth tracking for bodybuilders |
| Sleep | `sleep` | `sleepAnalysis` | `SleepSessionRecord` | Replace manual sleep logging with auto-sync |
| Resting Heart Rate | `resting_hr` | `restingHeartRate` | `RestingHeartRateRecord` | Peptide/cardio effect monitoring |
| Heart Rate Variability | `hrv` | `heartRateVariabilitySDNN` | `HeartRateVariabilityRmssdRecord` | Recovery and stress indicator |

### NOT Including
- **BMI**: Calculated locally from weight + height (already in `profiles` table)
- **Steps**: Not relevant to the app's core use case (medication/supplement tracking)
- **Active Energy**: Same reasoning as steps

### Technical Notes
- All new HealthKit identifiers are **read-only** (no write permissions needed for HR/HRV/Sleep)
- Sleep data from HealthKit comes as time intervals (in-bed, asleep, awake stages) — the hook calculates total sleep hours from sleep analysis samples
- HRV uses **SDNN** on iOS and **RMSSD** on Android — the hook normalizes this difference
- The `progress_entries` table needs **no schema changes**; the `metrics` JSONB field handles all new data types
- The unique index `(user_id, entry_date, category)` covers all new categories

---

## 1. Prerequisites & Environment Setup

### What You Need

| Tool | Why | How to Get It |
|------|-----|--------------|
| **Mac computer** | Required for iOS builds (Xcode only runs on macOS) | — |
| **Xcode 15+** | Builds the iOS app | Mac App Store → search "Xcode" → Install (it's ~12GB, takes a while) |
| **Xcode Command Line Tools** | Needed by npm/Capacitor | Open Terminal, run: `xcode-select --install` |
| **Node.js 18+** | Runs the dev server | https://nodejs.org — download the LTS version |
| **Git** | Clone your repo | Likely already installed. Check with `git --version` |
| **Physical iPhone** | HealthKit doesn't work in the Simulator | Any iPhone running iOS 15+ |
| **Apple Developer Account** | To run on your device | https://developer.apple.com (free tier works for testing) |
| **Android Studio** (optional) | Only if you also want Health Connect on Android | https://developer.android.com/studio |

### Clone & Set Up Your Project

```bash
# 1. Clone your repo (replace with your actual GitHub URL)
git clone https://github.com/YOUR_USERNAME/regimen.git
cd regimen

# 2. Install JavaScript dependencies
npm install

# 3. Build the web app
npm run build

# 4. Sync to native platforms
npx cap sync

# 5. Open in Xcode (this opens the full iOS project)
npx cap open ios
```

> **What does `npx cap sync` do?** It copies your built web app into the native iOS/Android projects and installs any native plugin dependencies. You'll run this command frequently.

### Quick Sanity Check

After `npx cap open ios`, Xcode should open with the `App` project. You should see:
- In the left sidebar: `App` → `App` → source files
- At the top: a device selector (your iPhone should appear when plugged in)
- Hit the ▶️ play button — the app should build and launch on your phone

If this works, you're ready. If not, check:
- Is your iPhone trusted? (Settings → General → Device Management on iPhone)
- Is your Apple ID added in Xcode? (Xcode → Settings → Accounts → add your Apple ID)
- Is the signing team set? (Click the `App` project → Signing & Capabilities → select your team)

---

## 2. Getting Started with Cursor

### What is Cursor?

Cursor is a code editor (based on VS Code) with built-in AI. You can ask it to write code, explain code, or make changes — similar to what you do in Lovable, but it works with local files on your computer.

### Install Cursor

1. Go to https://cursor.com
2. Download and install it
3. Open it — it looks just like VS Code

### Open Your Project

1. File → Open Folder → navigate to your `regimen` folder → Open
2. You should see all your project files in the left sidebar

### How to Use AI in Cursor

There are three main ways:

#### Cmd+K (Inline Edit)
1. Select some code in a file
2. Press `Cmd+K`
3. Type what you want to change (e.g., "add HealthKit import")
4. Press Enter — it suggests changes inline
5. Press `Cmd+Enter` to accept, or `Esc` to cancel

#### Cmd+L (Chat Panel)
1. Press `Cmd+L` to open the AI chat panel on the right
2. Type your question or request
3. It can see your open files and make suggestions
4. Click "Apply" on any code block to apply it to the file

#### Composer (Cmd+I) — Multi-File Edits
1. Press `Cmd+I` to open Composer
2. Describe what you want across multiple files
3. It creates a plan and edits multiple files at once
4. Review and accept the changes

### Tips for Prompting in Cursor

- **Be specific**: "Create a file at `src/hooks/useHealthKit.ts` that exports a hook called `useHealthKit`" is better than "make a health kit hook"
- **Reference files**: Say "look at `src/hooks/useStreaks.tsx` for the pattern to follow"
- **One step at a time**: Don't ask for the entire integration at once. Do it in phases.
- **If it makes a mistake**: Press `Cmd+Z` to undo, then try rephrasing

---

## 3. Getting Started with Claude Code (Alternative)

### What is Claude Code?

Claude Code is a command-line AI tool from Anthropic. You run it in your terminal and it can read, write, and edit files in your project. It's more powerful than Cursor for large multi-file changes but has no GUI.

### Install Claude Code

```bash
# Install globally
npm install -g @anthropic-ai/claude-code

# Navigate to your project
cd regimen

# Start Claude Code
claude
```

### How to Use It

Once you type `claude` and press Enter, you're in an interactive chat:

```
You: Create a new file at src/hooks/useHealthKit.ts that...
Claude: [creates the file and shows you what it did]
You: Now update src/components/SettingsScreen.tsx to add a toggle for HealthKit
Claude: [edits the file]
```

### Tips

- It can read any file in your project — just reference the path
- Say "read src/hooks/useStreaks.tsx" to show it an example of your patterns
- Say "run npm run build" and it will execute the command and show you errors
- It remembers context within the session

---

## 4. Plugin Installation

### iOS: HealthKit Plugin

We'll use `@perfood/capacitor-healthkit` — the most maintained Capacitor HealthKit plugin.

```bash
npm install @perfood/capacitor-healthkit

# After installing, sync to native
npx cap sync ios
```

### Android: Health Connect Plugin

```bash
npm install @nicoritschel/capacitor-healthconnect

# Sync to native
npx cap sync android
```

### Verify Installation

After `npx cap sync`, check that the plugins appear in:
- **iOS**: `ios/App/Podfile` should now list the HealthKit pod
- **Android**: The plugin should appear in `android/app/build.gradle` dependencies

Run `pod install` in the iOS directory if needed:
```bash
cd ios/App
pod install
cd ../..
```

---

## 5. iOS Configuration (HealthKit)

This is the most important section. HealthKit requires specific Xcode configuration that can't be done from code alone.

### Step 1: Add HealthKit Capability in Xcode

1. Open the project in Xcode: `npx cap open ios`
2. In the left sidebar, click on the **`App`** project (the top-level blue icon)
3. Make sure the **`App`** target is selected (not `App.xcodeproj`)
4. Click the **"Signing & Capabilities"** tab at the top
5. Click the **"+ Capability"** button (top left of the capabilities area)
6. Search for **"HealthKit"**
7. Double-click it to add it
8. You should see a "HealthKit" section appear with checkboxes. Leave defaults.

### Step 2: Update Info.plist

The `Info.plist` file is at `ios/App/App/Info.plist`. Add these two entries inside the `<dict>` tag (you can add them right before the closing `</dict>`):

```xml
<key>NSHealthShareUsageDescription</key>
<string>Regimen reads your weight, body composition, sleep, heart rate, and heart rate variability to track your health alongside your medication schedule.</string>
<key>NSHealthUpdateUsageDescription</key>
<string>Regimen can save your logged metrics to Apple Health to keep all your health data in one place.</string>
```

> **What are these?** iOS requires you to explain to users WHY your app wants to access their health data. These strings appear in the permission dialog.

### Step 3: Update App.entitlements

The entitlements file is at `ios/App/App/App.entitlements`. Add the HealthKit entitlement:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>com.apple.developer.associated-domains</key>
	<array>
		<string>applinks:getregimen.app</string>
	</array>
	<key>com.apple.developer.healthkit</key>
	<true/>
	<key>com.apple.developer.healthkit.access</key>
	<array/>
</dict>
</plist>
```

### Step 4: Register the Plugin (if needed)

Some Capacitor plugins auto-register. If this one doesn't, you may need to add it to `ios/App/App/AppDelegate.swift`. The plugin's README will tell you. Usually Capacitor 5+ handles this automatically.

### Step 5: Build & Test

```bash
# Rebuild
npm run build
npx cap sync ios
npx cap open ios
```

In Xcode, select your physical iPhone and press ▶️ to build and run. The first time you call a HealthKit function, iOS will show the permission dialog.

---

## 6. Android Configuration (Health Connect)

### Step 1: Update AndroidManifest.xml

Add these permissions to `android/app/src/main/AndroidManifest.xml`, inside the `<manifest>` tag (before `<application>`):

```xml
<!-- Health Connect Permissions -->
<uses-permission android:name="android.permission.health.READ_WEIGHT" />
<uses-permission android:name="android.permission.health.READ_BODY_FAT" />
<uses-permission android:name="android.permission.health.READ_LEAN_BODY_MASS" />
<uses-permission android:name="android.permission.health.READ_SLEEP" />
<uses-permission android:name="android.permission.health.READ_HEART_RATE" />
<uses-permission android:name="android.permission.health.READ_HEART_RATE_VARIABILITY" />
<uses-permission android:name="android.permission.health.WRITE_WEIGHT" />
<uses-permission android:name="android.permission.health.WRITE_BODY_FAT" />
```

### Step 2: Add Health Connect Activity

Inside the `<application>` tag in `AndroidManifest.xml`, add:

```xml
<!-- Health Connect permissions activity -->
<activity
    android:name="androidx.health.connect.client.impl.HealthConnectPermissionsActivity"
    android:exported="true">
    <intent-filter>
        <action android:name="androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE" />
    </intent-filter>
</activity>

<activity-alias
    android:name="ViewPermissionUsageActivity"
    android:exported="true"
    android:targetActivity="androidx.health.connect.client.impl.HealthConnectPermissionsActivity"
    android:permission="android.permission.START_VIEW_PERMISSION_USAGE">
    <intent-filter>
        <action android:name="android.intent.action.VIEW_PERMISSION_USAGE" />
        <category android:name="android.intent.category.HEALTH_PERMISSIONS" />
    </intent-filter>
</activity-alias>
```

### Step 3: Sync

```bash
npx cap sync android
```

---

## 7. React Hook Implementation

Create a new file at `src/hooks/useHealthKit.ts`:

```typescript
import { useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

// Import the plugin - adjust based on the actual plugin API
// import { HealthKit } from '@perfood/capacitor-healthkit';

/**
 * HealthKit/Health Connect integration hook.
 * 
 * Reads weight, body fat, lean body mass, sleep, resting heart rate,
 * and HRV data from the device's health store and syncs it into
 * the progress_entries table.
 */
export function useHealthKit() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncDate, setLastSyncDate] = useState<string | null>(null);

  /**
   * Check if HealthKit/Health Connect is available on this device
   */
  const checkAvailability = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) {
      setIsAvailable(false);
      return false;
    }

    try {
      // TODO: Call plugin's availability check
      // const result = await HealthKit.isAvailable();
      // setIsAvailable(result.available);
      // return result.available;
      return false;
    } catch (error) {
      console.error('HealthKit availability check failed:', error);
      setIsAvailable(false);
      return false;
    }
  }, []);

  /**
   * Request permission to read health data
   */
  const requestPermission = useCallback(async () => {
    try {
      // TODO: Request permissions for the data types we need
      // await HealthKit.requestAuthorization({
      //   all: [],  // write types
      //   read: [
      //     'HKQuantityTypeIdentifierBodyMass',              // weight
      //     'HKQuantityTypeIdentifierBodyFatPercentage',      // body fat %
      //     'HKQuantityTypeIdentifierLeanBodyMass',           // lean body mass
      //     'HKCategoryTypeIdentifierSleepAnalysis',          // sleep
      //     'HKQuantityTypeIdentifierRestingHeartRate',        // resting HR
      //     'HKQuantityTypeIdentifierHeartRateVariabilitySDNN', // HRV
      //   ],
      //   write: []
      // });
      
      setIsAuthorized(true);
      return true;
    } catch (error) {
      console.error('HealthKit permission request failed:', error);
      return false;
    }
  }, []);

  /**
   * Read weight data from HealthKit (last 30 days)
   */
  const readWeight = useCallback(async (): Promise<Array<{date: string, value: number, unit: string}>> => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // TODO: Query HealthKit for weight samples
      // const result = await HealthKit.queryQuantityType({
      //   sampleName: 'HKQuantityTypeIdentifierBodyMass',
      //   startDate: thirtyDaysAgo.toISOString(),
      //   endDate: new Date().toISOString(),
      //   unit: 'lb', // or 'kg' based on user preference
      // });
      
      // return result.data.map(sample => ({
      //   date: sample.startDate.split('T')[0],
      //   value: sample.quantity,
      //   unit: 'lb',
      // }));
      
      return [];
    } catch (error) {
      console.error('Failed to read weight from HealthKit:', error);
      return [];
    }
  }, []);

  /**
   * Read body fat percentage from HealthKit (last 30 days)
   */
  const readBodyFat = useCallback(async (): Promise<Array<{date: string, value: number}>> => {
    try {
      // TODO: Query HealthKit for body fat samples
      // sampleName: 'HKQuantityTypeIdentifierBodyFatPercentage'
      return [];
    } catch (error) {
      console.error('Failed to read body fat from HealthKit:', error);
      return [];
    }
  }, []);

  /**
   * Read lean body mass from HealthKit (last 30 days)
   * Useful for bodybuilders tracking muscle growth
   */
  const readLeanBodyMass = useCallback(async (): Promise<Array<{date: string, value: number, unit: string}>> => {
    try {
      // TODO: Query HealthKit for lean body mass samples
      // sampleName: 'HKQuantityTypeIdentifierLeanBodyMass'
      // unit: 'lb' or 'kg' based on user preference
      return [];
    } catch (error) {
      console.error('Failed to read lean body mass from HealthKit:', error);
      return [];
    }
  }, []);

  /**
   * Read sleep data from HealthKit (last 30 days)
   * 
   * Sleep comes as category samples with stages: inBed, asleepCore, asleepDeep, asleepREM, awake
   * We calculate total sleep hours by summing asleep stages.
   */
  const readSleep = useCallback(async (): Promise<Array<{date: string, hours: number, quality?: string}>> => {
    try {
      // TODO: Query HealthKit for sleep analysis
      // sampleName: 'HKCategoryTypeIdentifierSleepAnalysis'
      // 
      // Sleep samples come as time intervals with values:
      //   0 = inBed, 1 = asleepUnspecified, 2 = awake, 
      //   3 = asleepCore, 4 = asleepDeep, 5 = asleepREM
      //
      // Calculate total sleep = sum of (asleepCore + asleepDeep + asleepREM) durations
      // Group by night (use the date the sleep session STARTED)
      return [];
    } catch (error) {
      console.error('Failed to read sleep from HealthKit:', error);
      return [];
    }
  }, []);

  /**
   * Read resting heart rate from HealthKit (last 30 days)
   * Useful for monitoring peptide effects on cardiovascular health
   */
  const readRestingHeartRate = useCallback(async (): Promise<Array<{date: string, value: number}>> => {
    try {
      // TODO: Query HealthKit for resting heart rate
      // sampleName: 'HKQuantityTypeIdentifierRestingHeartRate'
      // unit: 'count/min' (bpm)
      return [];
    } catch (error) {
      console.error('Failed to read resting heart rate from HealthKit:', error);
      return [];
    }
  }, []);

  /**
   * Read heart rate variability from HealthKit (last 30 days)
   * 
   * NOTE: iOS uses SDNN measurement, Android uses RMSSD.
   * Both are in milliseconds. The hook normalizes this by storing
   * the raw value with a measurement_type marker.
   */
  const readHRV = useCallback(async (): Promise<Array<{date: string, value: number, measurement: 'sdnn' | 'rmssd'}>> => {
    try {
      // TODO: Query HealthKit for HRV
      // sampleName: 'HKQuantityTypeIdentifierHeartRateVariabilitySDNN'
      // unit: 'ms'
      // On Android (Health Connect): HeartRateVariabilityRmssdRecord
      return [];
    } catch (error) {
      console.error('Failed to read HRV from HealthKit:', error);
      return [];
    }
  }, []);

  /**
   * Sync all health data into the progress_entries table
   * 
   * Strategy: Pull last 30 days of data, upsert into progress_entries.
   * Each entry uses the `metrics` JSONB field with a `source: "healthkit"` marker
   * to distinguish from manually entered data.
   */
  const syncToProgress = useCallback(async () => {
    setIsSyncing(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Read all data types in parallel
      const [weightData, bodyFatData, leanMassData, sleepData, restingHRData, hrvData] = await Promise.all([
        readWeight(),
        readBodyFat(),
        readLeanBodyMass(),
        readSleep(),
        readRestingHeartRate(),
        readHRV(),
      ]);

      // Upsert weight entries
      for (const entry of weightData) {
        await supabase.from('progress_entries').upsert({
          user_id: user.id,
          entry_date: entry.date,
          category: 'weight',
          metrics: {
            weight: entry.value,
            unit: entry.unit,
            source: 'healthkit',
          },
        }, {
          onConflict: 'user_id,entry_date,category',
        });
      }

      // Upsert body fat entries
      for (const entry of bodyFatData) {
        await supabase.from('progress_entries').upsert({
          user_id: user.id,
          entry_date: entry.date,
          category: 'body_fat',
          metrics: {
            body_fat_percentage: entry.value,
            source: 'healthkit',
          },
        }, {
          onConflict: 'user_id,entry_date,category',
        });
      }

      // Upsert lean body mass entries
      for (const entry of leanMassData) {
        await supabase.from('progress_entries').upsert({
          user_id: user.id,
          entry_date: entry.date,
          category: 'lean_mass',
          metrics: {
            lean_body_mass: entry.value,
            unit: entry.unit,
            source: 'healthkit',
          },
        }, {
          onConflict: 'user_id,entry_date,category',
        });
      }

      // Upsert sleep entries
      for (const entry of sleepData) {
        await supabase.from('progress_entries').upsert({
          user_id: user.id,
          entry_date: entry.date,
          category: 'sleep',
          metrics: {
            sleep_hours: entry.hours,
            sleep_quality: entry.quality,
            source: 'healthkit',
          },
        }, {
          onConflict: 'user_id,entry_date,category',
        });
      }

      // Upsert resting heart rate entries
      for (const entry of restingHRData) {
        await supabase.from('progress_entries').upsert({
          user_id: user.id,
          entry_date: entry.date,
          category: 'resting_hr',
          metrics: {
            resting_heart_rate: entry.value,
            unit: 'bpm',
            source: 'healthkit',
          },
        }, {
          onConflict: 'user_id,entry_date,category',
        });
      }

      // Upsert HRV entries
      for (const entry of hrvData) {
        await supabase.from('progress_entries').upsert({
          user_id: user.id,
          entry_date: entry.date,
          category: 'hrv',
          metrics: {
            hrv_value: entry.value,
            measurement_type: entry.measurement, // 'sdnn' (iOS) or 'rmssd' (Android)
            unit: 'ms',
            source: 'healthkit',
          },
        }, {
          onConflict: 'user_id,entry_date,category',
        });
      }

      setLastSyncDate(new Date().toISOString());
      console.log(`HealthKit sync complete: ${weightData.length} weight, ${bodyFatData.length} body fat, ${leanMassData.length} lean mass, ${sleepData.length} sleep, ${restingHRData.length} resting HR, ${hrvData.length} HRV entries`);
    } catch (error) {
      console.error('HealthKit sync failed:', error);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, [readWeight, readBodyFat, readLeanBodyMass, readSleep, readRestingHeartRate, readHRV]);

  return {
    isAvailable,
    isAuthorized,
    isSyncing,
    lastSyncDate,
    checkAvailability,
    requestPermission,
    readWeight,
    readBodyFat,
    readLeanBodyMass,
    readSleep,
    readRestingHeartRate,
    readHRV,
    syncToProgress,
  };
}
```

### Key Design Decisions

1. **Upsert, not insert**: We upsert by `(user_id, entry_date, category)` so syncing twice doesn't create duplicates.
2. **`source: "healthkit"` marker**: In the `metrics` JSONB, we tag entries with their source so the UI can distinguish manual vs auto-synced data.
3. **30-day window**: We only pull the last 30 days to keep sync fast. Users who want historical data can do a one-time larger pull.
4. **Sync on app open**: The hook should be called from `App.tsx` or a top-level component when the app comes to the foreground.

---

## 8. UI Integration Points

### Settings Screen Toggle

In `src/components/settings/DataSettings.tsx` (or wherever health settings go), add:

```tsx
// Toggle for HealthKit sync
<div className="flex items-center justify-between">
  <div>
    <p className="font-medium">Health Data Sync</p>
    <p className="text-sm text-muted-foreground">
      Sync weight & body composition from Apple Health
    </p>
  </div>
  <Switch
    checked={healthKitEnabled}
    onCheckedChange={handleToggleHealthKit}
  />
</div>
```

When toggled ON:
1. Call `requestPermission()` — iOS shows the permission dialog
2. If granted, call `syncToProgress()` to do the initial sync
3. Store the preference in `localStorage` or the `profiles` table

### Progress Screen

The Progress screen already reads from `progress_entries`. Once HealthKit data syncs in, it should appear automatically in the weight chart. You may want to:
- Show a badge/icon next to auto-synced entries (look for `source: "healthkit"` in metrics)
- Add a "Last synced: X minutes ago" indicator

### Onboarding

Consider adding a HealthKit permission screen to the onboarding flow (after the notifications screen). Only show it on iOS native:

```tsx
{Capacitor.getPlatform() === 'ios' && (
  <HealthKitPermissionScreen onContinue={handleNext} />
)}
```

---

## 9. Testing

### ⚠️ Critical: HealthKit Does NOT Work in the Simulator

This is the #1 gotcha. You **must** test on a physical iPhone. The iOS Simulator does not include HealthKit.

### Adding Test Data on Your iPhone

1. Open the **Health** app on your iPhone
2. Tap **Browse** (bottom tab)
3. Go to **Body Measurements** → **Weight**
4. Tap **Add Data** (top right)
5. Enter a weight value and date
6. Repeat for a few different dates

Now when your app calls `readWeight()`, it should find these entries.

### Testing Flow

1. Build and run on your iPhone via Xcode
2. Go to Settings → toggle HealthKit ON
3. iOS will show a permission sheet — grant access to weight, body fat, lean body mass, sleep, heart rate, and HRV
4. The app should sync data from Apple Health into your progress chart
5. Check the database to verify entries have `source: "healthkit"` in metrics

### Android Testing

1. Install **Health Connect** app from Google Play Store on your test device
2. Open Health Connect → add some test weight data
3. Build with `npx cap run android`
4. Grant permissions when prompted
5. Verify sync works

### Debugging Tips

- Check the Xcode console (bottom pane) for log output
- If permissions fail, go to iPhone Settings → Privacy & Security → Health → Regimen → make sure access is granted
- If `isAvailable` returns false, you're probably running in the Simulator

---

## 10. Database Schema

### Good News: No Schema Changes Needed!

The existing `progress_entries` table already supports everything we need:

| Column | Type | Usage for HealthKit |
|--------|------|-------------------|
| `user_id` | uuid | The user |
| `entry_date` | date | The date of the health reading |
| `category` | varchar | `"weight"`, `"body_fat"`, `"lean_mass"`, `"sleep"`, `"resting_hr"`, `"hrv"` |
| `metrics` | jsonb | `{ weight: 185.5, unit: "lb", source: "healthkit" }` |

### Example Metrics by Category

| Category | Example `metrics` JSONB |
|----------|------------------------|
| `weight` | `{ "weight": 185.5, "unit": "lb", "source": "healthkit" }` |
| `body_fat` | `{ "body_fat_percentage": 18.5, "source": "healthkit" }` |
| `lean_mass` | `{ "lean_body_mass": 152.3, "unit": "lb", "source": "healthkit" }` |
| `sleep` | `{ "sleep_hours": 7.5, "sleep_quality": "good", "source": "healthkit" }` |
| `resting_hr` | `{ "resting_heart_rate": 62, "unit": "bpm", "source": "healthkit" }` |
| `hrv` | `{ "hrv_value": 45, "measurement_type": "sdnn", "unit": "ms", "source": "healthkit" }` |

### Optional: Add a Unique Index for Upsert

To make the `upsert` work correctly (avoid duplicates), you may want to add a unique index. Run this migration:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_progress_entries_unique_daily
ON progress_entries (user_id, entry_date, category);
```

This ensures only one entry per user per day per category. If a user logs weight manually AND HealthKit syncs weight for the same day, the most recent one wins (which is usually what you want).

### Source Convention

In the `metrics` JSONB field, always include `"source"`:
- `"source": "manual"` — user entered it themselves
- `"source": "healthkit"` — synced from Apple Health
- `"source": "health_connect"` — synced from Google Health Connect

This lets the UI show different indicators and avoids overwriting manual entries if desired.

---

## 11. Exact Prompts for Cursor / Claude Code

Copy-paste these prompts one at a time. Each one is a self-contained step.

### Prompt 1: Install the Plugin

```
Install the @perfood/capacitor-healthkit npm package. After installing, run `npx cap sync ios`.
```

### Prompt 2: iOS Configuration

```
I need to configure HealthKit for my Capacitor iOS app. Please:

1. Update ios/App/App/Info.plist to add NSHealthShareUsageDescription and NSHealthUpdateUsageDescription keys. The share description should say "Regimen reads your weight, body composition, sleep, heart rate, and heart rate variability to track your health alongside your medication schedule." The update description should say "Regimen can save your logged metrics to Apple Health to keep all your health data in one place."

2. Update ios/App/App/App.entitlements to add the com.apple.developer.healthkit entitlement (set to true) and com.apple.developer.healthkit.access (empty array).

Keep all existing entries in both files. Only add the new HealthKit entries.
```

### Prompt 3: Create the React Hook

```
Create a React hook at src/hooks/useHealthKit.ts that integrates with @perfood/capacitor-healthkit. 

Look at the existing hook pattern in src/hooks/useStreaks.tsx for style reference.

The hook should export:
- checkAvailability() - checks if HealthKit is available (only on native iOS)
- requestPermission() - requests read access for: weight, body fat %, lean body mass, sleep analysis, resting heart rate, and heart rate variability (SDNN)
- readWeight() - reads weight samples from the last 30 days
- readBodyFat() - reads body fat % from the last 30 days  
- readLeanBodyMass() - reads lean body mass from the last 30 days (for muscle growth tracking)
- readSleep() - reads sleep analysis from the last 30 days, calculating total sleep hours from sleep stages (asleepCore + asleepDeep + asleepREM)
- readRestingHeartRate() - reads resting heart rate from the last 30 days (in bpm)
- readHRV() - reads heart rate variability SDNN from the last 30 days (in ms). Note: Android uses RMSSD measurement instead — include a measurement_type marker.
- syncToProgress() - syncs all health data into the progress_entries Supabase table

For syncToProgress, upsert entries using (user_id, entry_date, category) as the unique key. Each entry should have a metrics JSONB field with source: "healthkit" to distinguish from manual entries.

Category keys: "weight", "body_fat", "lean_mass", "sleep", "resting_hr", "hrv"

Import supabase from @/integrations/supabase/client.
Use Capacitor.isNativePlatform() to guard native-only calls.
```

### Prompt 4: Add Settings Toggle

```
Update src/components/settings/DataSettings.tsx (or create it if it doesn't exist) to add a "Health Data Sync" toggle.

When toggled ON:
1. Call requestPermission() from useHealthKit
2. If permission granted, call syncToProgress() 
3. Save the preference to localStorage under key "healthkit_enabled"

When toggled OFF:
1. Remove the localStorage key
2. Don't delete any existing synced data

Show "Sync weight, body composition, sleep, and heart rate from Apple Health" as the description.
Only show this toggle on iOS native (use Capacitor.getPlatform() === 'ios').
On Android, show "Sync from Health Connect" instead.
```

### Prompt 5: Add Auto-Sync on App Open

```
Update src/hooks/useAppActive.ts (or src/App.tsx) to automatically sync HealthKit data when the app comes to the foreground, but only if:
1. We're on iOS native
2. The user has enabled HealthKit sync (localStorage key "healthkit_enabled" is "true")
3. We haven't synced in the last 15 minutes

Use the useHealthKit hook's syncToProgress() function. Add a lastSyncTimestamp to localStorage to throttle syncing.
```

### Prompt 6: Database Index (Optional)

```
I need to add a unique index to my Supabase database. Please create the SQL migration:

CREATE UNIQUE INDEX IF NOT EXISTS idx_progress_entries_unique_daily
ON progress_entries (user_id, entry_date, category);

This ensures one progress entry per user per day per category for clean HealthKit upserts.
```

---

## Workflow Summary

```
┌─────────────────────────────────────────────┐
│  YOUR WORKFLOW                              │
│                                             │
│  1. Clone repo from GitHub                  │
│  2. Open in Cursor (or use Claude Code)     │
│  3. Follow prompts 1-6 above               │
│  4. Build & test on physical iPhone         │
│  5. Push changes to GitHub                  │
│  6. Changes sync back to Lovable            │
│  7. Continue UI work in Lovable             │
└─────────────────────────────────────────────┘
```

### After You're Done

Once you push the HealthKit changes to GitHub:
1. The code changes will sync back to Lovable
2. You can continue building UI features, progress visualizations, and settings in Lovable
3. Any future native-only changes (like adding new HealthKit data types) would go through Cursor again

### Quick Reference: Common Commands

```bash
# Build web app
npm run build

# Sync to iOS
npx cap sync ios

# Open in Xcode
npx cap open ios

# Sync to Android
npx cap sync android

# Open in Android Studio
npx cap open android

# Run on connected device
npx cap run ios
npx cap run android
```

---

## Troubleshooting

### "HealthKit is not available"
→ You're running in the Simulator. Use a physical iPhone.

### "Permission denied" or no data appears
→ Go to iPhone Settings → Privacy & Security → Health → Regimen → make sure all toggles are ON

### "Module not found: @perfood/capacitor-healthkit"
→ Run `npm install @perfood/capacitor-healthkit` then `npx cap sync ios`

### Xcode build fails with "HealthKit not found"
→ Make sure you added the HealthKit capability in Xcode (Signing & Capabilities → + Capability → HealthKit)

### Pod install fails
→ Run `cd ios/App && pod install --repo-update && cd ../..`

### App crashes on launch after adding HealthKit
→ Check that both Info.plist usage descriptions are present. iOS will crash the app if you try to access HealthKit without them.

---

