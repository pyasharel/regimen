

# Add Platform Tracking to User Profiles

## What We're Adding

1. **`signup_platform`** (text) -- Captures which platform the user originally signed up on (ios, android, web). Set once, never changes. Useful for understanding acquisition channels.

2. **`last_platform`** (text) -- Captures the most recent platform the user opened the app on. Updated every session. Useful for knowing where your active users are right now.

3. **`last_app_version`** (text) -- Captures the most recent app version the user is running. Updated every session. Helps you know how many users have upgraded to the latest build.

## Why Three Columns Instead of One

A single `user_platform` column wouldn't tell the full story. A user might sign up on web but primarily use the iOS app. With `signup_platform` + `last_platform`, you can answer both "where do users come from?" and "where are users active?"

## Will This Require a New App Update?

**No.** Platform detection already works in the current app code via `Capacitor.getPlatform()`. The new columns just need code changes to write the detected platform to the profile table during signup and on each session start. Since these are web-bundle changes (TypeScript/React), they deploy automatically without a new App Store or Play Store binary.

Existing users will get `signup_platform` backfilled as `null` (unknown -- they signed up before tracking), but `last_platform` and `last_app_version` will populate on their very next session.

## Implementation Steps

### Step 1: Database Migration
Add three new columns to the `profiles` table:
- `signup_platform` (text, nullable) -- set once on signup
- `last_platform` (text, nullable) -- updated each session
- `last_app_version` (text, nullable) -- updated each session

### Step 2: Update Auth.tsx (Signup Flows)
In all three signup paths (email, Google native, Google web), set `signup_platform` and `last_platform` to the detected platform, and `last_app_version` to the current app version.

### Step 3: Update useAnalytics.tsx (Session Start)
On each session start (app open, resume from background), update `last_platform` and `last_app_version` on the user's profile. This ensures the values stay current.

### Step 4: Query Android Users
Once deployed, you'll be able to run a simple query to see platform breakdown:

```text
SELECT last_platform, COUNT(*) 
FROM profiles 
WHERE last_active_at > now() - interval '7 days'
GROUP BY last_platform
```

## What You'll Be Able to Answer

- How many active users are on Android vs iOS vs web?
- Which platform are new signups coming from?
- Are Android users converting to paid at the same rate?
- What app version are users on by platform?
