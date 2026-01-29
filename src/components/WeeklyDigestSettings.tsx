import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Eye } from "lucide-react";

export const WeeklyDigestSettings = () => {
  const [enabled, setEnabled] = useState(false);
  const [day, setDay] = useState("sunday");
  const [time, setTime] = useState("19:00");

  useEffect(() => {
    try {
      const settings = localStorage.getItem("weeklyDigestSettings");
      if (settings) {
        const parsed = JSON.parse(settings);
        setEnabled(parsed.enabled || false);
        setDay(parsed.day || "sunday");
        setTime(parsed.time || "19:00");
      }
    } catch (e) {
      console.error('[WeeklyDigestSettings] Failed to parse settings, using defaults:', e);
      localStorage.removeItem("weeklyDigestSettings");
    }
  }, []);

  const handleToggle = async (checked: boolean) => {
    setEnabled(checked);
    saveSettings(checked, day, time);

    if (checked) {
      await scheduleWeeklyDigest(day, time);
    } else {
      await cancelWeeklyDigest();
    }
  };

  const handleDayChange = async (newDay: string) => {
    setDay(newDay);
    saveSettings(enabled, newDay, time);
    if (enabled) {
      await scheduleWeeklyDigest(newDay, time);
    }
  };

  const handleTimeChange = async (newTime: string) => {
    setTime(newTime);
    saveSettings(enabled, day, newTime);
    if (enabled) {
      await scheduleWeeklyDigest(day, newTime);
    }
  };

  const saveSettings = (enabled: boolean, day: string, time: string) => {
    localStorage.setItem("weeklyDigestSettings", JSON.stringify({ enabled, day, time }));
  };

  const scheduleWeeklyDigest = async (day: string, time: string) => {
    const dayMap: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };

    const [hours, minutes] = time.split(":").map(Number);
    const now = new Date();
    const targetDay = dayMap[day];
    const daysUntilTarget = (targetDay - now.getDay() + 7) % 7 || 7;
    
    const nextOccurrence = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + daysUntilTarget,
      hours,
      minutes,
      0
    );

    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: 9999,
            title: "📊 Weekly Digest",
            body: "Your week in review is ready! See your progress and achievements.",
            schedule: {
              at: nextOccurrence,
              repeats: true,
              every: "week",
            },
          },
        ],
      });
    } catch (error) {
      console.error("Failed to schedule weekly digest:", error);
    }
  };

  const cancelWeeklyDigest = async () => {
    try {
      await LocalNotifications.cancel({ notifications: [{ id: 9999 }] });
    } catch (error) {
      console.error("Failed to cancel weekly digest:", error);
    }
  };

  return (
    <div className="space-y-4 p-4 rounded-lg border border-border/50 bg-card/50">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Label htmlFor="weekly-digest" className="text-base font-medium">
            Weekly Digest
          </Label>
          <p className="text-sm text-muted-foreground">
            Get a weekly summary of your progress
          </p>
        </div>
        <Switch
          id="weekly-digest"
          checked={enabled}
          onCheckedChange={handleToggle}
        />
      </div>

      {enabled && (
        <div className="space-y-3 pt-2 border-t border-border/50">
          <div className="space-y-2">
            <Label htmlFor="digest-day" className="text-sm">Delivery Day</Label>
            <Select value={day} onValueChange={handleDayChange}>
              <SelectTrigger id="digest-day">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sunday">Sunday</SelectItem>
                <SelectItem value="monday">Monday</SelectItem>
                <SelectItem value="tuesday">Tuesday</SelectItem>
                <SelectItem value="wednesday">Wednesday</SelectItem>
                <SelectItem value="thursday">Thursday</SelectItem>
                <SelectItem value="friday">Friday</SelectItem>
                <SelectItem value="saturday">Saturday</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="digest-time" className="text-sm">Delivery Time</Label>
            <Select value={time} onValueChange={handleTimeChange}>
              <SelectTrigger id="digest-time">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="06:00">6:00 AM</SelectItem>
                <SelectItem value="07:00">7:00 AM</SelectItem>
                <SelectItem value="08:00">8:00 AM</SelectItem>
                <SelectItem value="09:00">9:00 AM</SelectItem>
                <SelectItem value="12:00">12:00 PM</SelectItem>
                <SelectItem value="17:00">5:00 PM</SelectItem>
                <SelectItem value="18:00">6:00 PM</SelectItem>
                <SelectItem value="19:00">7:00 PM</SelectItem>
                <SelectItem value="20:00">8:00 PM</SelectItem>
                <SelectItem value="21:00">9:00 PM</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              localStorage.setItem("openWeeklyDigest", "true");
              window.dispatchEvent(new Event("focus"));
            }}
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview Digest
          </Button>
        </div>
      )}
    </div>
  );
};
