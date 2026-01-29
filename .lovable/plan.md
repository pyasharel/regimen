
Goal
- Get your iOS build unblocked by fixing the persistent CocoaPods error:
  “The sandbox is not in sync with the Podfile.lock…”
- Ensure the build number shows 18 in Xcode.
- Then outline exactly how to deploy to Android and how to capture the right logs on both phones to diagnose the “notification tap → black screen” issue.

What that CocoaPods error means (in plain English)
- iOS keeps two “lock” files that must match:
  - ios/App/Podfile.lock (your project’s “expected” pod versions)
  - ios/App/Pods/Manifest.lock (what CocoaPods actually installed)
- Xcode runs a build step that compares them. If they differ, the build stops with that error.

Most common reason it keeps coming back
- The command order is wrong:
  - If you run `pod install`, then later run `npx cap sync ios`, Capacitor may update iOS plugin pod settings and change what Podfile.lock expects; now the installed Pods no longer match.
- Or you’re building the wrong file in Xcode:
  - Opening `App.xcodeproj` instead of `App.xcworkspace` can lead to confusion and stale state (the workspace is the correct entrypoint for a CocoaPods project).

Part 1 — Fix the CocoaPods “sandbox not in sync” error (repeatable recipe)
1) Fully quit Xcode
- Xcode → Quit Xcode (not just close window)

2) Confirm you’re in the project root
- In Terminal, go to the folder that contains:
  - package.json
  - capacitor.config.ts
- This avoids running commands from the wrong directory.

3) Run the commands in the correct order (important)
From the project root:
- `npm run build`
- `npx cap sync ios`

Then install pods (this must be inside ios/App):
- `cd ios/App`
- `pod install`
- `cd ../..`

4) Open the correct Xcode file
- Use:
  - `npx cap open ios`
- Or manually open:
  - ios/App/App.xcworkspace  (NOT App.xcodeproj)

5) Clean + Build
- In Xcode:
  - Product → Clean Build Folder (hold Option if needed to show the deeper clean)
  - Then build/run again

Part 2 — If you STILL get the same error after doing Part 1
This “nuclear but safe” reset forces Pods + locks to regenerate cleanly.

1) Quit Xcode again

2) Reset Pods state (in ios/App)
In Terminal:
- `cd ios/App`
- `rm -rf Pods`
- `rm -f Podfile.lock`
- (optional but often helpful) `pod deintegrate`

Then reinstall:
- `pod install --repo-update`
- `cd ../..`

3) Delete Xcode Derived Data (clears stale build cache)
- Terminal:
  - `rm -rf ~/Library/Developer/Xcode/DerivedData`

4) Re-open the workspace and build
- `npx cap open ios`
- Build again

If this still fails:
- It strongly suggests CocoaPods itself is broken or not properly linked on your Mac.
- Use the “CocoaPods Dependency Issues” section in your TROUBLESHOOTING_IOS.md:
  - `brew cleanup`
  - `brew link --overwrite cocoapods`
  - then `cd ios/App && pod install`

Part 3 — Why Xcode still shows Build 17 (and how to make it 18)
Changing `appBuild` in capacitor.config.ts sets what the web app displays, but the iOS native build number updates only after you run the sync script.

Do this from the project root:
- `./sync-version.sh`

Then re-open iOS:
- `npx cap open ios`

Verify in Xcode:
- Target “App” → General → Identity → Build should show 18
(If it still shows 17, you can manually set it there, but the goal is to have the script keep it consistent.)

Part 4 — Get the latest Android build onto your Android phone (Android Studio)
Prereqs
- USB cable
- On Android phone:
  - Enable Developer Options
  - Enable USB Debugging
  - Allow the computer when prompted

Steps
1) From project root:
- `npm run build`
- `npx cap sync android`

2) Open Android Studio:
- `npx cap open android`

3) In Android Studio:
- Wait for Gradle sync to finish (bottom status bar)
- Top device dropdown: select your connected phone
- Click the Run button (green play triangle)

4) If it installs but you’re not sure it’s the newest build:
- Open the app → Settings → Help
- Confirm:
  - Build: 18
  - Bundle timestamp is recent (this is the most trustworthy signal for “new web bundle is running”)

Part 5 — Debugging the “notification tap → black screen” on both phones (what to capture)
Key idea: we want logs from the moment you tap the notification through the moment the screen goes black.

A) Android (best signal)
1) Open Android Studio → Logcat
2) Select:
- Device: your phone
- App/process: your app (or “No Filters” if it disappears)
3) Set filters/search terms (one at a time if needed):
- `FATAL EXCEPTION`
- `AndroidRuntime`
- `chromium`
- `WebView`
- `Capacitor`
- `ActivityManager`
4) Reproduce:
- Force close app
- Trigger a dose notification
- Tap notification
- If it goes black, immediately stop and copy/export the Logcat output around that time window

What we’re looking for:
- A crash (Java/Kotlin stack trace)
- A WebView renderer crash
- An Activity lifecycle issue (resume/restore)
- A resource/permission error after notification tap

B) iPhone (two layers of logs)
1) Native logs (Xcode)
- Xcode → Window → Devices and Simulators
- Select your iPhone → Open Console
- Reproduce the notification tap → capture logs

2) WebView logs (Safari Web Inspector)
- On iPhone: Settings → Safari → Advanced → Web Inspector (ON)
- On Mac: Safari → Develop → [Your iPhone] → select the app’s WebView
- Watch Console for JS errors during the notification tap/open flow

C) Confirm whether the “boot recovery” triggers
Your app includes:
- A startup preflight to prevent corrupted storage from causing black screens
- A 6-second “boot timeout” that should show a recovery UI if the app never renders
When the black screen happens, note:
- Does anything appear after ~6 seconds (a recovery screen with “Reset & Retry”)?
  - If yes: we likely have a storage/JS boot failure path.
  - If no: we likely have a native splash/WebView-level hang/crash (different fix path).

Part 6 — Preventing the Pods error from returning (simple rule)
When updating native builds, always do:
1) `npm run build`
2) `npx cap sync ios`
3) `cd ios/App && pod install && cd ../..`
4) open workspace + build

Avoid running `npx cap sync ios` after `pod install` unless you plan to run `pod install` again.

What I need from you (so we can move fast)
- Tell me which step you’re stuck on:
  1) Does `pod install` succeed (no errors) when run inside `ios/App`?
  2) Are you opening `ios/App/App.xcworkspace` (not `.xcodeproj`)?
  3) After doing Part 2 (nuclear reset), does the error change or stay identical?
- For the black screen: once you can install on Android, paste the Logcat snippet around the failure (especially any “FATAL EXCEPTION” / WebView crash lines). That will tell us whether we need a native-level fix or another JS-level hardening tweak.