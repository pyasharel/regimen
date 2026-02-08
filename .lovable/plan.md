

# Fix Welcome Email: Coral Checkmarks & Landing Page CTA

## What's Being Fixed

1. **Missing icons** - Replace broken SVG icons with coral-colored checkmarks (✓)
2. **Wrong CTA link** - Change from web app (`getregimen.app/today`) to landing page (`helloregimen.com`)

---

## Changes to Make

### File: `supabase/functions/send-welcome-email/index.ts`

#### Change 1: Replace SVG Icons with Coral Checkmarks

The current list items (lines ~143-171) have inline SVGs that don't render in most email clients.

Replace with styled checkmarks using your brand coral color (#FF6B6B):

```html
<ul style="margin: 0; padding: 0; list-style: none;">
  <li style="color: #484848; font-size: 15px; line-height: 1.8; margin-bottom: 12px;">
    <span style="color: #FF6B6B; font-weight: bold;">✓</span> Track your daily doses with smart reminders
  </li>
  <li style="color: #484848; font-size: 15px; line-height: 1.8; margin-bottom: 12px;">
    <span style="color: #FF6B6B; font-weight: bold;">✓</span> Manage multiple compounds with custom schedules
  </li>
  <li style="color: #484848; font-size: 15px; line-height: 1.8; margin-bottom: 12px;">
    <span style="color: #FF6B6B; font-weight: bold;">✓</span> Document progress with photos and metrics
  </li>
  <li style="color: #484848; font-size: 15px; line-height: 1.8; margin-bottom: 12px;">
    <span style="color: #FF6B6B; font-weight: bold;">✓</span> Build streaks and stay motivated
  </li>
  <li style="color: #484848; font-size: 15px; line-height: 1.8;">
    <span style="color: #FF6B6B; font-weight: bold;">✓</span> Visualize your journey with insights
  </li>
</ul>
```

#### Change 2: Update CTA Button Link

Line ~175 currently links to the web app:
```html
<a href="https://getregimen.app/today" ...>Get Started Now</a>
```

Change to link to the marketing landing page:
```html
<a href="https://helloregimen.com" ...>Get Started Now</a>
```

---

## Summary

| What | Before | After |
|------|--------|-------|
| Icons | Inline SVGs (broken in most email clients) | Coral checkmarks (✓) |
| CTA Link | `https://getregimen.app/today` (web app) | `https://helloregimen.com` (landing page) |

---

## Result

After this fix:
- Checkmarks will render correctly in all email clients with your brand coral color (#FF6B6B)
- "Get Started Now" takes users to your landing page where they can download the app for their specific platform (iOS or Android)

