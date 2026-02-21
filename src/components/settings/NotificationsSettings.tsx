import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Bell, Camera, Scale, Send, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WeeklyDigestSettings } from "@/components/WeeklyDigestSettings";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { toast } from "sonner";
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { supabase } from "@/integrations/supabase/client";
import { rescheduleAllCycleReminders } from "@/utils/cycleReminderScheduler";
import { scheduleAllUpcomingDoses, ensureDoseActionTypesRegistered } from "@/utils/notificationScheduler";
import { persistentStorage } from "@/utils/persistentStorage";
import { trackNotificationToggled } from "@/utils/analytics";
import { useAndroidAlarmPermission } from "@/hooks/useAndroidAlarmPermission";
import { SwipeBackContainer } from "@/components/ui/SwipeBackContainer";

type PermissionStatus = 'granted' | 'prompt' | 'denied' | 'unknown';

export const NotificationsSettings = () => {
  const navigate = useNavigate();
  const { isSubscribed } = useSubscription();
  
  // Notification states
  const [doseReminders, setDoseReminders] = useState(false); // Default to false until loaded
  const [cycleReminders, setCycleReminders] = useState(true);
  const [photoReminders, setPhotoReminders] = useState(false);
  const [photoFrequency, setPhotoFrequency] = useState<"daily" | "weekly">("weekly");
  const [photoTime, setPhotoTime] = useState("08:00");
  const [photoDay, setPhotoDay] = useState<string>("0"); // 0 = Sunday
  const [weightReminders, setWeightReminders] = useState(false);
  const [weightFrequency, setWeightFrequency] = useState<"daily" | "weekly">("daily");
  const [weightTime, setWeightTime] = useState("07:00");
  const [weightDay, setWeightDay] = useState<string>("1"); // 1 = Monday
  
  // OS-level permission status (tri-state)
  const [osPermissionStatus, setOsPermissionStatus] = useState<PermissionStatus>('unknown');
  const [testingNotification, setTestingNotification] = useState(false);
  const [requestingPermission, setRequestingPermission] = useState(false);

  // Android exact alarm permission check
  const { status: exactAlarmStatus, openSettings: openAlarmSettings } = useAndroidAlarmPermission(true);

  const checkPermissionStatus = async (): Promise<PermissionStatus> => {
    if (!Capacitor.isNativePlatform()) {
      return 'granted'; // Web fallback
    }
    
    try {
      const status = await LocalNotifications.checkPermissions();
      console.log('[NotificationsSettings] OS permission status:', status.display);
      
      if (status.display === 'granted') return 'granted';
      if (status.display === 'denied') return 'denied';
      return 'prompt'; // 'prompt' or any other status
    } catch (error) {
      console.error('[NotificationsSettings] Error checking permissions:', error);
      return 'unknown';
    }
  };

  useEffect(() => {
    // Load saved preferences from persistent storage
    const loadSettings = async () => {
      // Check actual iOS permission status first
      const status = await checkPermissionStatus();
      setOsPermissionStatus(status);
      
      // Load doseReminders from storage
      const savedDoseReminders = await persistentStorage.getBoolean('doseReminders', true);
      setDoseReminders(savedDoseReminders);
      console.log('[NotificationsSettings] Loaded doseReminders:', savedDoseReminders);
      
      const savedCycleReminders = await persistentStorage.get('cycleReminders');
      setCycleReminders(savedCycleReminders !== 'false');
      
      const savedPhotoReminders = await persistentStorage.getBoolean('photoReminders', false);
      const savedPhotoFrequency = await persistentStorage.get('photoFrequency') as "daily" | "weekly" || "weekly";
      const savedPhotoTime = await persistentStorage.get('photoTime') || "08:00";
      const savedPhotoDay = await persistentStorage.get('photoDay') || "0";
      const savedWeightReminders = await persistentStorage.getBoolean('weightReminders', false);
      const savedWeightFrequency = await persistentStorage.get('weightFrequency') as "daily" | "weekly" || "daily";
      const savedWeightTime = await persistentStorage.get('weightTime') || "07:00";
      const savedWeightDay = await persistentStorage.get('weightDay') || "1";
      
      setPhotoReminders(savedPhotoReminders);
      setPhotoFrequency(savedPhotoFrequency);
      setPhotoTime(savedPhotoTime);
      setPhotoDay(savedPhotoDay);
      setWeightReminders(savedWeightReminders);
      setWeightFrequency(savedWeightFrequency);
      setWeightTime(savedWeightTime);
      setWeightDay(savedWeightDay);
    };
    
    loadSettings();
  }, []);

  // Request notification permission and schedule if granted
  const requestPermissionAndSchedule = async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) return true;
    
    setRequestingPermission(true);
    
    try {
      // Register action types first
      await ensureDoseActionTypesRegistered();
      
      const result = await LocalNotifications.requestPermissions();
      const granted = result.display === 'granted';
      
      setOsPermissionStatus(granted ? 'granted' : 'denied');
      
      if (granted) {
        // Schedule notifications immediately
        await scheduleNotificationsNow();
        toast.success("Notifications enabled!");
      } else {
        toast.error("Notifications not enabled. You can enable them in iOS Settings.");
      }
      
      return granted;
    } catch (error) {
      console.error('[NotificationsSettings] Error requesting permissions:', error);
      toast.error("Failed to request notification permissions");
      return false;
    } finally {
      setRequestingPermission(false);
    }
  };

  // Schedule all dose notifications
  const scheduleNotificationsNow = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Determine freeCompoundId for non-subscribed users
      let freeCompoundId: string | undefined;
      if (!isSubscribed) {
        const { data: oldest } = await supabase
          .from('compounds')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('created_at', { ascending: true })
          .limit(1);
        if (oldest && oldest.length > 0) freeCompoundId = oldest[0].id;
      }

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
        await scheduleAllUpcomingDoses(dosesWithName, isSubscribed, freeCompoundId);
        console.log('[NotificationsSettings] Scheduled notifications after permission grant');
      }
    } catch (error) {
      console.error('[NotificationsSettings] Error scheduling notifications:', error);
    }
  };

  // Open iOS Settings for this app
  const openAppSettings = async () => {
    try {
      // Use Browser plugin as fallback since App.openUrl doesn't support app-settings on all platforms
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url: 'app-settings:' });
    } catch (error) {
      console.error('[NotificationsSettings] Error opening settings:', error);
      toast.info("Open Settings → Regimen → Notifications to enable");
    }
  };

  // Send a test notification to verify the pipeline works
  const sendTestNotification = async () => {
    if (!Capacitor.isNativePlatform()) {
      toast.info("Test notifications only work on iOS/Android");
      return;
    }
    
    setTestingNotification(true);
    
    try {
      // If permission is 'prompt', request first
      if (osPermissionStatus === 'prompt') {
        const granted = await requestPermissionAndSchedule();
        if (!granted) {
          setTestingNotification(false);
          return;
        }
      }
      
      // If permission is denied, guide to settings
      if (osPermissionStatus === 'denied') {
        toast.error("Enable notifications in iOS Settings first");
        openAppSettings();
        setTestingNotification(false);
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
      
      toast.success("Test notification sent - check in 3 seconds!");
      console.log('[NotificationsSettings] Test notification scheduled for 3 seconds from now');
    } catch (error) {
      console.error('[NotificationsSettings] Error sending test notification:', error);
      toast.error("Failed to send test notification");
    } finally {
      setTestingNotification(false);
    }
  };

  const triggerHaptic = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        await Haptics.impact({ style: ImpactStyle.Light });
      } else if ('vibrate' in navigator) {
        navigator.vibrate(30);
      }
    } catch (err) {
      console.log('Haptic failed:', err);
    }
  };

  const handlePhotoRemindersToggle = async (checked: boolean) => {
    triggerHaptic();
    if (checked && !isSubscribed) {
      toast.error("Photo reminders require subscription");
      return;
    }
    setPhotoReminders(checked);
    await persistentStorage.setBoolean('photoReminders', checked);
    trackNotificationToggled('photo', checked);
    if (checked) {
      toast.success("Photo reminders enabled");
    }
  };

  const handleWeightRemindersToggle = async (checked: boolean) => {
    triggerHaptic();
    setWeightReminders(checked);
    await persistentStorage.setBoolean('weightReminders', checked);
    trackNotificationToggled('weight', checked);
    if (checked) {
      toast.success("Weight tracking reminders enabled");
    }
  };
  
  const handleDoseRemindersToggle = async (checked: boolean) => {
    triggerHaptic();
    
    if (checked) {
      // User wants to enable dose reminders
      if (osPermissionStatus === 'prompt') {
        // Need to request permission first
        const granted = await requestPermissionAndSchedule();
        if (!granted) {
          // Permission denied - don't enable the toggle
          return;
        }
      } else if (osPermissionStatus === 'denied') {
        // Can't enable - guide to settings
        toast.error("Enable notifications in iOS Settings to use dose reminders");
        openAppSettings();
        return;
      }
      
      // Permission granted or already granted - enable
      setDoseReminders(true);
      await persistentStorage.setBoolean('doseReminders', true);
      trackNotificationToggled('dose', true);
      
      // Schedule notifications now
      await scheduleNotificationsNow();
      toast.success("Dose reminders enabled");
    } else {
      // User wants to disable dose reminders
      setDoseReminders(false);
      await persistentStorage.setBoolean('doseReminders', false);
      trackNotificationToggled('dose', false);
      toast.success("Dose reminders disabled");
    }
  };

  const handleCycleRemindersToggle = async (checked: boolean) => {
    triggerHaptic();
    setCycleReminders(checked);
    await persistentStorage.setBoolean('cycleReminders', checked);
    trackNotificationToggled('cycle', checked);

    // Update all compounds' cycle_reminders_enabled field
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('compounds')
        .update({ cycle_reminders_enabled: checked })
        .eq('user_id', user.id)
        .eq('has_cycles', true);

      // Reschedule all cycle reminders
      await rescheduleAllCycleReminders();

      if (checked) {
        toast.success("Cycle reminders enabled - You'll be notified before and on the day of transitions");
      } else {
        toast.success("Cycle reminders disabled");
      }
    }
  };

  const handlePhotoFrequencyChange = async (value: "daily" | "weekly") => {
    triggerHaptic();
    setPhotoFrequency(value);
    await persistentStorage.set('photoFrequency', value);
  };

  const handlePhotoTimeChange = async (value: string) => {
    triggerHaptic();
    setPhotoTime(value);
    await persistentStorage.set('photoTime', value);
  };

  const handlePhotoDayChange = async (value: string) => {
    triggerHaptic();
    setPhotoDay(value);
    await persistentStorage.set('photoDay', value);
  };

  const handleWeightFrequencyChange = async (value: "daily" | "weekly") => {
    triggerHaptic();
    setWeightFrequency(value);
    await persistentStorage.set('weightFrequency', value);
  };

  const handleWeightTimeChange = async (value: string) => {
    triggerHaptic();
    setWeightTime(value);
    await persistentStorage.set('weightTime', value);
  };

  const handleWeightDayChange = async (value: string) => {
    triggerHaptic();
    setWeightDay(value);
    await persistentStorage.set('weightDay', value);
  };

  return (
    <SwipeBackContainer className="min-h-screen bg-background">
      
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur-sm safe-top">
        <div className="flex items-center justify-between max-w-2xl mx-auto px-4 py-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-9 w-9"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Notifications</h1>
          <div className="w-9" />
        </div>
      </header>

      <div className="p-4 space-y-6 max-w-2xl mx-auto">
        {/* Permission Status Cards - Only show on native */}
        {Capacitor.isNativePlatform() && (
          <>
            {/* Status: prompt - Show "Enable Notifications" CTA */}
            {osPermissionStatus === 'prompt' && (
              <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Bell className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Enable Notifications</h3>
                    <p className="text-sm text-muted-foreground">Get reminders for your doses</p>
                  </div>
                </div>
                <Button 
                  onClick={requestPermissionAndSchedule}
                  disabled={requestingPermission}
                  className="w-full"
                >
                  {requestingPermission ? "Enabling..." : "Enable Notifications"}
                </Button>
              </div>
            )}

            {/* Status: denied - Show gentle hint with Settings button */}
            {osPermissionStatus === 'denied' && (
              <div className="rounded-xl border border-muted bg-muted/30 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <Bell className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground">Notifications Off</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      To receive dose reminders, enable notifications in iOS Settings.
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={openAppSettings}
                      className="mt-3 gap-2"
                    >
                      <Settings className="h-4 w-4" />
                      Open Settings
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        
        {/* Test Notification Button - Only show when permissions are granted */}
        {Capacitor.isNativePlatform() && osPermissionStatus === 'granted' && (
          <Button 
            variant="outline" 
            onClick={sendTestNotification}
            disabled={testingNotification}
            className="w-full"
          >
            <Send className="h-4 w-4 mr-2" />
            {testingNotification ? "Sending..." : "Send Test Notification"}
          </Button>
        )}

        {/* Dose Reminders */}
        {/* Android Exact Alarm Warning */}
        {Capacitor.getPlatform() === 'android' && exactAlarmStatus === 'denied' && (
          <div className="rounded-xl border border-destructive/50 bg-destructive/5 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                <Bell className="h-5 w-5 text-destructive" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-foreground">Alarms & Reminders Off</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Android requires this permission for scheduled dose reminders. Without it, notifications won't fire.
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={openAlarmSettings}
                  className="mt-3 gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Enable in Settings
                </Button>
              </div>
            </div>
          </div>
        )}
        <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <Label className="font-semibold">Dose Reminders</Label>
                <p className="text-sm text-muted-foreground">Get notified for scheduled doses</p>
              </div>
            </div>
            <Switch
              checked={doseReminders}
              onCheckedChange={handleDoseRemindersToggle}
              disabled={osPermissionStatus === 'denied'}
            />
          </div>
          {osPermissionStatus === 'denied' && (
            <p className="text-xs text-muted-foreground mt-2">
              Enable notifications in iOS Settings to use dose reminders
            </p>
          )}
        </div>

        {/* Cycle Reminders */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                <Bell className="h-5 w-5 text-accent" />
              </div>
              <div>
                <Label className="font-semibold flex items-center gap-2">
                  Cycle Change Reminders
                </Label>
                <p className="text-sm text-muted-foreground">Get notified before cycle transitions</p>
              </div>
            </div>
            <Switch
              checked={cycleReminders}
              onCheckedChange={handleCycleRemindersToggle}
            />
          </div>
        </div>

        {/* Photo Reminders */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10">
                <Camera className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <Label className="font-semibold flex items-center gap-2">
                  Progress Photo Reminders
                </Label>
                <p className="text-sm text-muted-foreground">Track your transformation</p>
              </div>
            </div>
            <Switch
              checked={photoReminders}
              onCheckedChange={handlePhotoRemindersToggle}
            />
          </div>
          
          {photoReminders && (
            <div className="mt-4 space-y-3 pt-3 border-t border-border">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Frequency</Label>
                <Select value={photoFrequency} onValueChange={handlePhotoFrequencyChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {photoFrequency === "weekly" && (
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Day of Week</Label>
                  <Select value={photoDay} onValueChange={handlePhotoDayChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Sunday</SelectItem>
                      <SelectItem value="1">Monday</SelectItem>
                      <SelectItem value="2">Tuesday</SelectItem>
                      <SelectItem value="3">Wednesday</SelectItem>
                      <SelectItem value="4">Thursday</SelectItem>
                      <SelectItem value="5">Friday</SelectItem>
                      <SelectItem value="6">Saturday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Time</Label>
                <Select value={photoTime} onValueChange={handlePhotoTimeChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="06:00">6:00 AM</SelectItem>
                    <SelectItem value="07:00">7:00 AM</SelectItem>
                    <SelectItem value="08:00">8:00 AM</SelectItem>
                    <SelectItem value="09:00">9:00 AM</SelectItem>
                    <SelectItem value="10:00">10:00 AM</SelectItem>
                    <SelectItem value="18:00">6:00 PM</SelectItem>
                    <SelectItem value="19:00">7:00 PM</SelectItem>
                    <SelectItem value="20:00">8:00 PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {/* Weight Tracking Reminders */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                <Scale className="h-5 w-5 text-success" />
              </div>
              <div>
                <Label className="font-semibold">Weight Tracking Reminders</Label>
                <p className="text-sm text-muted-foreground">Stay consistent with weigh-ins</p>
              </div>
            </div>
            <Switch
              checked={weightReminders}
              onCheckedChange={handleWeightRemindersToggle}
            />
          </div>
          
          {weightReminders && (
            <div className="mt-4 space-y-3 pt-3 border-t border-border">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Frequency</Label>
                <Select value={weightFrequency} onValueChange={handleWeightFrequencyChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {weightFrequency === "weekly" && (
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Day of Week</Label>
                  <Select value={weightDay} onValueChange={handleWeightDayChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Sunday</SelectItem>
                      <SelectItem value="1">Monday</SelectItem>
                      <SelectItem value="2">Tuesday</SelectItem>
                      <SelectItem value="3">Wednesday</SelectItem>
                      <SelectItem value="4">Thursday</SelectItem>
                      <SelectItem value="5">Friday</SelectItem>
                      <SelectItem value="6">Saturday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Time</Label>
                <Select value={weightTime} onValueChange={handleWeightTimeChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="06:00">6:00 AM</SelectItem>
                    <SelectItem value="07:00">7:00 AM</SelectItem>
                    <SelectItem value="08:00">8:00 AM</SelectItem>
                    <SelectItem value="09:00">9:00 AM</SelectItem>
                    <SelectItem value="10:00">10:00 AM</SelectItem>
                    <SelectItem value="18:00">6:00 PM</SelectItem>
                    <SelectItem value="19:00">7:00 PM</SelectItem>
                    <SelectItem value="20:00">8:00 PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {/* Weekly Digest Section */}
        <WeeklyDigestSettings />
      </div>
    </SwipeBackContainer>
  );
};
