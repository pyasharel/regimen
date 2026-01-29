
# Fix Notifications Not Triggering After Dose Edits

## Problem Summary

You're editing dose times but not receiving notifications because:
1. Editing a dose only updates the database - **it doesn't reschedule notifications**
2. The Settings UI shows "Enabled" even if iOS permissions were never actually granted
3. The `doseReminders` preference isn't being loaded/saved properly

## Root Causes Found

### Issue 1: DoseEditModal Doesn't Reschedule Notifications
When you edit a dose in `DoseEditModal.tsx`, it calls `onDoseUpdated()` which triggers `loadDoses()` in TodayScreen. This only refreshes the UI display - **it never calls `scheduleAllUpcomingDoses()`** to update the iOS notification system.

### Issue 2: Settings UI Doesn't Reflect iOS Permission Status
`NotificationsSettings.tsx` initializes `doseReminders` to `true` by default and never checks iOS's actual permission status. Even if you denied notifications, the switch shows "enabled".

### Issue 3: doseReminders Not Loaded From Storage
In NotificationsSettings, the `doseReminders` state defaults to `true` but is never loaded from `persistentStorage` (unlike photo/weight reminders which ARE loaded).

## The Fix

### Part 1: Trigger Notification Reschedule After Dose Edit
**File: `src/components/DoseEditModal.tsx`**

After saving a dose (both `saveDoseOnly` and `saveAndUpdateSchedule`), call a helper function to reschedule all notifications:

```typescript
import { scheduleAllUpcomingDoses } from "@/utils/notificationScheduler";
import { useSubscription } from "@/contexts/SubscriptionContext";

// Inside the component:
const { isSubscribed } = useSubscription();

// After successful save in saveDoseOnly() and saveAndUpdateSchedule():
// ...after onDoseUpdated()...
// Reschedule notifications to pick up the edited time
await rescheduleNotificationsAfterEdit();
```

Create a helper that fetches doses and reschedules:
```typescript
const rescheduleNotificationsAfterEdit = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { data: allDoses } = await supabase
      .from('doses')
      .select('*, compounds(name, is_active)')
      .eq('user_id', user.id)
      .eq('taken', false);
      
    if (allDoses) {
      const activeDoses = allDoses.filter(d => d.compounds?.is_active !== false);
      const dosesWithName = activeDoses.map(d => ({
        ...d,
        compound_name: d.compounds?.name || 'Medication'
      }));
      await scheduleAllUpcomingDoses(dosesWithName, isSubscribed);
      console.log('[DoseEdit] Rescheduled notifications after edit');
    }
  } catch (error) {
    console.error('[DoseEdit] Failed to reschedule notifications:', error);
  }
};
```

### Part 2: Settings UI Should Reflect Actual iOS Permission Status
**File: `src/components/settings/NotificationsSettings.tsx`**

Add a check for iOS notification permissions and load `doseReminders` from storage:

```typescript
import { LocalNotifications } from '@capacitor/local-notifications';

// Add state for actual OS permission
const [osPermissionGranted, setOsPermissionGranted] = useState<boolean | null>(null);

useEffect(() => {
  const loadSettings = async () => {
    // Check actual iOS permission status
    if (Capacitor.isNativePlatform()) {
      const status = await LocalNotifications.checkPermissions();
      setOsPermissionGranted(status.display === 'granted');
    } else {
      setOsPermissionGranted(true); // Web fallback
    }
    
    // Load doseReminders from storage (was missing!)
    const savedDoseReminders = await persistentStorage.getBoolean('doseReminders', true);
    setDoseReminders(savedDoseReminders);
    
    // ...rest of existing loading...
  };
  loadSettings();
}, []);
```

Show a warning banner if OS permission is denied:
```tsx
{osPermissionGranted === false && (
  <div className="bg-warning/10 text-warning p-3 rounded-lg text-sm">
    Notifications are blocked at the system level. 
    Open Settings → Regimen → Notifications to enable.
  </div>
)}
```

### Part 3: Add a "Test Notification" Button for Debugging
In NotificationsSettings, add a button to send an immediate test notification:

```typescript
const sendTestNotification = async () => {
  if (!Capacitor.isNativePlatform()) return;
  
  const status = await LocalNotifications.checkPermissions();
  if (status.display !== 'granted') {
    toast.error("Notifications not permitted by iOS");
    return;
  }
  
  await LocalNotifications.schedule({
    notifications: [{
      id: 999999,
      title: 'Regimen Test',
      body: 'If you see this, notifications are working!',
      schedule: { at: new Date(Date.now() + 3000) }, // 3 seconds from now
    }],
  });
  toast.success("Test notification sent - check in 3 seconds");
};
```

## Files to Modify

1. **`src/components/DoseEditModal.tsx`**
   - Import `scheduleAllUpcomingDoses` and `useSubscription`
   - Add `rescheduleNotificationsAfterEdit()` helper
   - Call it after both `saveDoseOnly()` and `saveAndUpdateSchedule()`

2. **`src/components/settings/NotificationsSettings.tsx`**
   - Import `LocalNotifications`
   - Add `osPermissionGranted` state
   - Load `doseReminders` from `persistentStorage` 
   - Add warning banner for denied permissions
   - Add "Test Notification" button

## Testing Steps

After implementing:
1. Build and deploy to your iPhone
2. Go to Settings → Notifications and tap "Test Notification"
3. You should receive a notification within 3 seconds
4. Edit a dose to be 1 minute in the future
5. Background the app and wait - you should receive the notification

## Expected Console Logs

When editing a dose:
```
[DoseEdit] Rescheduled notifications after edit
📅 Scheduling X notifications from Y total doses
✅ Scheduled: [MedName] at [time] (ID: XXXXX)
```
