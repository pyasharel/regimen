
# Complete Android Setup Guide - Step by Step

This guide walks you through everything from scratch, assuming you have Android Studio downloaded but nothing else set up.

---

## Part 1: Set Up Your Local Project (15 minutes)

### Step 1.1: Pull the Latest Code from Lovable

Open Terminal on your Mac and navigate to your project folder:

```bash
cd /path/to/your/regimen-project
git pull origin main
```

### Step 1.2: Install Dependencies

```bash
npm install
```

### Step 1.3: Build the Web App

```bash
npm run build
```

You should see a success message and a `dist/` folder will be created.

### Step 1.4: Remove the Incomplete Android Folder

The current android folder is incomplete. Remove it:

```bash
rm -rf android
```

### Step 1.5: Add Android Platform

This generates the full Android project:

```bash
npx cap add android
```

### Step 1.6: Sync Web Assets to Android

```bash
npx cap sync android
```

**Checkpoint**: You should now have a complete `android/` folder with many subfolders.

---

## Part 2: Set Up Android Studio (20 minutes)

### Step 2.1: Open Android Studio

1. Launch Android Studio from your Applications folder
2. If this is your first time, it will ask you to complete initial setup
3. Choose "Standard" installation when asked
4. Wait for it to download SDK components (this can take 10-15 minutes)

### Step 2.2: Open Your Project in Android Studio

Run this command in Terminal:

```bash
npx cap open android
```

This opens your Regimen project in Android Studio.

### Step 2.3: Wait for Gradle Sync

1. Android Studio will show a "Gradle sync" progress bar at the bottom
2. Wait for it to complete (can take 2-5 minutes the first time)
3. You may see warnings - that's normal as long as it says "BUILD SUCCESSFUL"

### Step 2.4: Set Up Your Android Phone for Testing

On your Android phone:

1. Go to **Settings → About Phone**
2. Find **Build Number** and tap it 7 times rapidly
3. You'll see "You are now a developer!"
4. Go back to **Settings → System → Developer Options**
5. Enable **USB Debugging**
6. Connect your phone to your Mac via USB cable
7. When prompted on your phone, tap **Allow** to trust this computer

### Step 2.5: Run the App on Your Phone

1. In Android Studio, look at the top toolbar
2. You should see your phone name in a dropdown (e.g., "Pixel 7" or "Samsung Galaxy")
3. Click the green **Play** button (▶)
4. Wait for the build to complete
5. The app should launch on your phone!

**Checkpoint**: If you see the Regimen app on your phone, basic setup is complete!

---

## Part 3: Generate App Icons (30 minutes)

### Step 3.1: Use App Icon Generator

1. Go to [https://www.appicon.co/](https://www.appicon.co/)
2. Upload your 1024x1024 icon (the same one you used for iOS)
   - File location: `src/assets/app-icon-1024.png`
3. Check **Android** checkbox
4. Click **Generate**
5. Download the zip file

### Step 3.2: Copy Icons to Android Project

1. Extract the downloaded zip file
2. You'll see folders like `mipmap-mdpi`, `mipmap-hdpi`, etc.
3. Navigate to `android/app/src/main/res/` in Finder
4. Replace the existing mipmap folders with the new ones

### Step 3.3: Add Splash Screen Image

1. Take your splash screen image (same as iOS, around 2732x2732px)
2. Rename it to `splash.png`
3. Copy it to `android/app/src/main/res/drawable/`

### Step 3.4: Rebuild and Test

```bash
npm run build
npx cap sync android
```

Then run the app again in Android Studio to see your new icons.

---

## Part 4: Set Up RevenueCat for Android (45 minutes)

### Step 4.1: Create Android App in RevenueCat

1. Go to [https://app.revenuecat.com/](https://app.revenuecat.com/)
2. Log in with your existing account
3. Click on your **Regimen** project
4. Go to **Project Settings** (gear icon) → **Apps**
5. Click **+ New App**
6. Select **Google Play Store**
7. For now, just enter:
   - **App name**: Regimen (Android)
   - You can skip the service credentials for now
8. Click **Create App**
9. **Copy the Android API key** (starts with `goog_...`)

### Step 4.2: Update the Code with Your Android Key

1. In Lovable, open `src/contexts/SubscriptionContext.tsx`
2. Find this line:
   ```typescript
   const REVENUECAT_ANDROID_KEY = 'goog_YOUR_ANDROID_KEY_HERE';
   ```
3. Replace `goog_YOUR_ANDROID_KEY_HERE` with your actual key from Step 4.1
4. Let me know once you've done this and I'll make the update

---

## Part 5: Set Up Google Sign-In (30 minutes)

### Step 5.1: Get Your SHA-1 Fingerprint

In Terminal, navigate to your android folder and run:

```bash
cd android
./gradlew signingReport
```

Look for output like this:
```text
Variant: debug
Config: debug
Store: /Users/yourname/.android/debug.keystore
Alias: AndroidDebugKey
SHA1: XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX
```

**Copy the SHA1 value** (the long string with colons).

### Step 5.2: Create Android OAuth Client in Google Cloud

1. Go to [https://console.cloud.google.com/](https://console.cloud.google.com/)
2. Make sure you're in the same project as your iOS app (check the dropdown at the top)
3. Go to **APIs & Services → Credentials**
4. Click **+ Create Credentials → OAuth client ID**
5. Choose **Android** as the application type
6. Fill in:
   - **Name**: Regimen Android
   - **Package name**: `com.regimen.app`
   - **SHA-1 fingerprint**: Paste the SHA1 from Step 5.1
7. Click **Create**
8. **Copy the Client ID** (looks like `123456789-xxxx.apps.googleusercontent.com`)

### Step 5.3: Update Capacitor Config

Tell me the Android Client ID and I'll update `capacitor.config.ts` to include it.

---

## Part 6: Create Google Play Developer Account (30 minutes)

### Step 6.1: Register as a Developer

1. Go to [https://play.google.com/console/](https://play.google.com/console/)
2. Click **Create an Account** or sign in with your Google account
3. You'll need to pay a **$25 one-time registration fee**
4. Fill out your developer profile information
5. Accept the Developer Distribution Agreement

### Step 6.2: Create Your App

1. Click **Create app**
2. Fill in:
   - **App name**: Regimen
   - **Default language**: English (United States)
   - **App or game**: App
   - **Free or paid**: Free
3. Check all the declaration boxes
4. Click **Create app**

### Step 6.3: Set Up Store Listing

Navigate to **Grow → Store presence → Main store listing**:

1. **Short description** (80 chars max): Use your App Store subtitle
2. **Full description**: Use your App Store description
3. **App icon**: Upload your 512x512 icon
4. **Feature graphic**: Create a 1024x500px banner image (required for Google Play)
5. **Screenshots**: You can reuse your iOS screenshots or take Android-specific ones

---

## Part 7: Build & Upload to Google Play (45 minutes)

### Step 7.1: Generate a Signed Release Build

In Android Studio:

1. Go to **Build → Generate Signed Bundle / APK**
2. Select **Android App Bundle** (AAB)
3. Click **Next**
4. Click **Create new...** to create a signing key:
   - **Key store path**: Choose a location to save it (e.g., `regimen-keystore.jks`)
   - **Password**: Create a strong password (save this somewhere safe!)
   - **Alias**: `regimen`
   - **Alias password**: Can be same as keystore password
   - Fill in your name/organization info
5. Click **OK**, then **Next**
6. Select **release** build variant
7. Click **Create**

The AAB file will be saved to `android/app/release/app-release.aab`

### Step 7.2: Upload to Google Play Console

1. In Google Play Console, go to your app
2. Navigate to **Release → Production**
3. Click **Create new release**
4. Upload your AAB file
5. Add release notes (same as your iOS "What's New")
6. Click **Review release**
7. Click **Start rollout to Production**

---

## Part 8: Connect RevenueCat to Google Play (30 minutes)

### Step 8.1: Create Service Account in Google Cloud

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Go to **IAM & Admin → Service Accounts**
3. Click **+ Create Service Account**
4. Name it `revenuecat-service-account`
5. Click **Create and Continue**
6. Skip the optional steps, click **Done**
7. Click on the new service account
8. Go to **Keys → Add Key → Create new key → JSON**
9. Download the JSON file

### Step 8.2: Grant Access in Google Play Console

1. In Google Play Console, go to **Settings → API access**
2. Click **Link** next to Google Cloud Project
3. Go back to **Service accounts** section
4. Find your service account and click **Grant access**
5. Give it **Admin** permissions for your app

### Step 8.3: Add Credentials to RevenueCat

1. In RevenueCat, go to your Android app settings
2. Upload the JSON key file from Step 8.1
3. Save

---

## Estimated Total Time

| Part | Time |
|------|------|
| Part 1: Local Project Setup | 15 min |
| Part 2: Android Studio Setup | 20 min |
| Part 3: App Icons | 30 min |
| Part 4: RevenueCat Android | 45 min |
| Part 5: Google Sign-In | 30 min |
| Part 6: Play Developer Account | 30 min |
| Part 7: Build & Upload | 45 min |
| Part 8: Connect RevenueCat | 30 min |
| **Total** | **~4 hours** |

---

## What to Do First

Start with **Parts 1-3** to get the app running on your phone. This confirms everything works before spending money on the Play Console account.

Once you verify the app runs correctly:
- Do **Part 6** to create your Google Play account ($25 fee)
- Then proceed with **Parts 4, 5, 7, 8** for subscriptions and full setup

---

## Information I Need From You

Once you complete certain steps, send me:

1. **RevenueCat Android API key** (from Part 4) - I'll update the code
2. **Android OAuth Client ID** (from Part 5) - I'll update capacitor.config.ts
3. Any error messages you encounter - I'll help troubleshoot
