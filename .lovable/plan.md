

# Data Export Fix and Screen Redesign

## Problem 1: Export Does Nothing on Mobile

The current export creates a DOM `<a>` element with a `download` attribute and programmatically clicks it. This is a browser-only pattern that silently fails in Capacitor's iOS/Android WebView. The toast says "Data exported successfully" but no file is actually saved.

**Fix:** On native platforms, use `@capacitor/filesystem` to write the CSV to a temp file, then `@capacitor/share` to open the native share sheet so the user can save to Files, AirDrop, email it, etc. On web (preview), keep the current download approach as a fallback.

## Problem 2: Screen Layout and "Danger Zone" Title

The current layout has two equally prominent cards stacked on top of each other, making the destructive action feel like a primary feature. The "Danger Zone" heading is developer jargon that doesn't match the app's friendly tone.

**Redesign approach:**
- Keep Export Data as the primary card (unchanged visually)
- Move "Clear All Data" to the bottom of the screen as a smaller, less prominent element -- just a text-style button with a subtle separator above it, not a full card
- Rename "Danger Zone" to "Clear All Data" as the section title
- Keep the confirmation dialog exactly as-is for safety

---

## Technical Changes

### File: `src/components/settings/DataSettings.tsx`

**Export fix:**
1. Import `Capacitor` from `@capacitor/core`, `Filesystem` and `Directory` from `@capacitor/filesystem`, `Share` from `@capacitor/share`
2. In `handleExportData()`, after generating the CSV string:
   - If `Capacitor.isNativePlatform()`: write the CSV to a temp file using `Filesystem.writeFile()` in the `CACHE` directory, then call `Share.share({ url: fileResult.uri })` to open the native share sheet
   - Else (web): keep the existing `<a>` download approach
3. Update the success toast to say "Data ready to share" on native (since the share sheet handles the rest)

**Layout redesign:**
1. Remove the destructive card wrapper (the red-bordered box)
2. Replace with a simpler bottom section: a separator line, then the "Clear All Data" title in muted text, the description, and a smaller outline-style destructive button
3. This visually de-emphasizes the destructive action while keeping it accessible

### No other files need changes.

