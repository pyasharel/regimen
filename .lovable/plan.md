
# Two-Part Fix: Text Selection & Log Today Modal Improvements

## What Jay Found

Jay spotted two things:
1. Tapping and holding on the bottom navigation labels (and potentially other UI text) shows the native iOS "Copy / Look Up / Translate" popup — this makes the app feel non-native and unpolished
2. He prefers emoji-based mood ratings over numbered buttons, and suggested sliders for harder-to-quantify metrics like sleep quality

---

## Part 1: Fixing Text Selection (Priority — Immediate Fix)

**Root cause:** The app has no global `user-select: none` rule. Every text label, navigation tab name, section header, and button label is currently selectable on iOS with a long-press, producing the native text selection menu.

**The right fix** is a single CSS rule added to `src/index.css` that disables text selection app-wide by default, with explicit opt-in for any field that actually *needs* selection (textarea, input). This is the standard approach used in all native-feeling web apps.

**What will be changed:**
- `src/index.css` — add `-webkit-user-select: none` and `user-select: none` to the `body` rule, plus `-webkit-touch-callout: none` which suppresses the iOS long-press callout bubble (the Copy/Look Up/Translate popup)
- Re-enable selection for `input`, `textarea`, and any `[contenteditable]` elements so users can still interact with form fields normally

**Scope of the problem (confirmed via codebase search):**
- `BottomNavigation` — tab labels "Today", "My Stack", etc. are all selectable `<span>` elements
- `MainHeader` — "REGIMEN" logo text and page title are selectable
- All dose card labels, section headers (MORNING, AFTERNOON, EVENING), compound names, timestamps
- The `LogTodayDrawerContent` and `LogTodayModal` section labels
- Onboarding screens, settings labels, progress screen labels

---

## Part 2: Log Today Modal — Deferred (Strategic Decision)

Jay's feedback:
- Prefers the emoji mood picker UI (Great / Okay / Bad / Terrible) with symptom chips
- Sliders instead of numbered 1–5 buttons for sleep/energy — harder to mentally quantify with numbers
- "I don't really enjoy manually logging this stuff" — hints that HealthKit auto-import will matter most here

**My recommendation: do not redesign the modal right now.** Here's why:

1. Once Apple Health is connected (Saturday), sleep quality, steps, and potentially weight will flow in automatically — reducing the friction Jay is describing. The redesign would look very different post-HealthKit.
2. Injection site tracking will likely be added to the dose-logging flow, which will change the overall "log something" UX significantly.
3. A symptom chip redesign (like the reference app Jay sent) is a meaningful project — probably 3–4 hours of careful work — and doing it now before knowing what data HealthKit provides would likely mean reworking it again soon.

**What to tell Jay:** Good feedback — the HealthKit integration coming Saturday will auto-pull sleep and other metrics, which addresses the manual logging friction. The emoji mood + symptom chip UI is on the roadmap once that's in place.

---

## Technical Plan

### Files to change:

**`src/index.css`** — 2 targeted additions to the `@layer base` block:

1. Inside the existing `body` rule, add:
   ```css
   -webkit-user-select: none;
   user-select: none;
   -webkit-touch-callout: none;
   ```

2. Add a new explicit opt-in rule for form elements:
   ```css
   input, textarea, [contenteditable] {
     -webkit-user-select: text;
     user-select: text;
   }
   ```

That is the **entire change needed** — two CSS additions. No component-level changes required. The global rule propagates to every screen including BottomNavigation, MainHeader, TodayScreen dose cards, My Stack, Progress, Settings, Onboarding, and all modals/drawers.

### Why this approach is safe:
- `user-select: none` does not affect click/tap interactions at all — buttons and links still work normally
- Inputs and textareas are explicitly opted back in, so the weight field, notes field, search fields, etc. all remain fully functional
- The `-webkit-touch-callout: none` property is the specific iOS Safari/WKWebView property that disables the callout bubble — this is exactly what native iOS apps disable
- This mirrors what Capacitor/Ionic apps do by default in their CSS resets

### What this will NOT affect:
- Any legitimate user-selectable text (there isn't any in this app — it's not a document reader)
- Input/textarea focus, keyboard appearance, or text editing
- The existing `select-none` classes already scattered in UI components (they become redundant but harmless)
