import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Bell, Camera, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PremiumDiamond } from "@/components/ui/icons/PremiumDiamond";
import { WeeklyDigestSettings } from "@/components/WeeklyDigestSettings";
import { toast } from "sonner";

export const NotificationsSettings = () => {
  const navigate = useNavigate();
  const [isPremium, setIsPremium] = useState(false);
  
  // Notification states
  const [doseReminders, setDoseReminders] = useState(true);
  const [photoReminders, setPhotoReminders] = useState(false);
  const [photoFrequency, setPhotoFrequency] = useState<"daily" | "weekly">("weekly");
  const [photoTime, setPhotoTime] = useState("08:00");
  const [photoDay, setPhotoDay] = useState<string>("0"); // 0 = Sunday
  const [weightReminders, setWeightReminders] = useState(false);
  const [weightFrequency, setWeightFrequency] = useState<"daily" | "weekly">("daily");
  const [weightTime, setWeightTime] = useState("07:00");
  const [weightDay, setWeightDay] = useState<string>("1"); // 1 = Monday

  useEffect(() => {
    const savedPremium = localStorage.getItem('testPremiumMode') === 'true';
    setIsPremium(savedPremium);
    
    // Load saved preferences
    const savedPhotoReminders = localStorage.getItem('photoReminders') === 'true';
    const savedPhotoFrequency = localStorage.getItem('photoFrequency') as "daily" | "weekly" || "weekly";
    const savedPhotoTime = localStorage.getItem('photoTime') || "08:00";
    const savedPhotoDay = localStorage.getItem('photoDay') || "0";
    const savedWeightReminders = localStorage.getItem('weightReminders') === 'true';
    const savedWeightFrequency = localStorage.getItem('weightFrequency') as "daily" | "weekly" || "daily";
    const savedWeightTime = localStorage.getItem('weightTime') || "07:00";
    const savedWeightDay = localStorage.getItem('weightDay') || "1";
    
    setPhotoReminders(savedPhotoReminders);
    setPhotoFrequency(savedPhotoFrequency);
    setPhotoTime(savedPhotoTime);
    setPhotoDay(savedPhotoDay);
    setWeightReminders(savedWeightReminders);
    setWeightFrequency(savedWeightFrequency);
    setWeightTime(savedWeightTime);
    setWeightDay(savedWeightDay);
  }, []);

  const handlePhotoRemindersToggle = (checked: boolean) => {
    if (checked && !isPremium) {
      toast.error("Photo reminders are a premium feature");
      return;
    }
    setPhotoReminders(checked);
    localStorage.setItem('photoReminders', String(checked));
    if (checked) {
      toast.success("Photo reminders enabled");
    }
  };

  const handleWeightRemindersToggle = (checked: boolean) => {
    setWeightReminders(checked);
    localStorage.setItem('weightReminders', String(checked));
    if (checked) {
      toast.success("Weight tracking reminders enabled");
    }
  };

  const handlePhotoFrequencyChange = (value: "daily" | "weekly") => {
    setPhotoFrequency(value);
    localStorage.setItem('photoFrequency', value);
  };

  const handlePhotoTimeChange = (value: string) => {
    setPhotoTime(value);
    localStorage.setItem('photoTime', value);
  };

  const handlePhotoDayChange = (value: string) => {
    setPhotoDay(value);
    localStorage.setItem('photoDay', value);
  };

  const handleWeightFrequencyChange = (value: "daily" | "weekly") => {
    setWeightFrequency(value);
    localStorage.setItem('weightFrequency', value);
  };

  const handleWeightTimeChange = (value: string) => {
    setWeightTime(value);
    localStorage.setItem('weightTime', value);
  };

  const handleWeightDayChange = (value: string) => {
    setWeightDay(value);
    localStorage.setItem('weightDay', value);
  };

  return (
    <div className="min-h-screen bg-background safe-top">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border px-4 py-4 bg-background/95 backdrop-blur-sm safe-top">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
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
        {/* Dose Reminders */}
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
              onCheckedChange={setDoseReminders}
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
                  {!isPremium && <PremiumDiamond className="h-4 w-4 text-primary" />}
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
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {/* Weekly Digest */}
        <WeeklyDigestSettings />

      </div>
    </div>
  );
};