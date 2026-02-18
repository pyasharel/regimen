import { useState, useEffect, useRef } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { scheduleAllUpcomingDoses } from "@/utils/notificationScheduler";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { persistentStorage } from "@/utils/persistentStorage";

interface DoseEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  dose: {
    id: string;
    compound_id: string;
    compound_name?: string;
    scheduled_date: string;
    scheduled_time: string;
    dose_amount: number;
    dose_unit: string;
    calculated_iu?: number | null;
    calculated_ml?: number | null;
  } | null;
  onDoseUpdated: () => void;
}

export const DoseEditModal = ({ isOpen, onClose, dose, onDoseUpdated }: DoseEditModalProps) => {
  const { toast } = useToast();
  const { isSubscribed } = useSubscription();
  const [loading, setLoading] = useState(false);
  const [showScopeChoice, setShowScopeChoice] = useState(false);
  const savingRef = useRef(false); // Guard against rapid double-saves

  // Helper to reschedule notifications after any dose edit
  const rescheduleNotificationsAfterEdit = async () => {
    try {
      // Check if user has dose reminders enabled
      const doseRemindersEnabled = await persistentStorage.getBoolean('doseReminders', true);
      if (!doseRemindersEnabled) {
        console.log('[DoseEdit] Dose reminders disabled - skipping reschedule');
        return;
      }
      
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
        console.log('[DoseEdit] Rescheduled notifications after edit');
      }
    } catch (error) {
      console.error('[DoseEdit] Failed to reschedule notifications:', error);
    }
  };
  
  // Form state
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState("");
  const [doseAmount, setDoseAmount] = useState("");
  
  // Track what changed
  const [timeChanged, setTimeChanged] = useState(false);
  
  useEffect(() => {
    if (dose) {
      setSelectedDate(new Date(dose.scheduled_date + 'T00:00:00'));
      setSelectedTime(dose.scheduled_time);
      setDoseAmount(dose.dose_amount.toString());
      setTimeChanged(false);
      setShowScopeChoice(false);
    }
  }, [dose]);

  const handleTimeChange = (newTime: string) => {
    setSelectedTime(newTime);
    setTimeChanged(newTime !== dose?.scheduled_time);
  };

  const handleSave = () => {
    // If time changed, show scope choice dialog
    if (timeChanged) {
      setShowScopeChoice(true);
    } else {
      // Only date or amount changed - apply to this dose only
      saveDoseOnly();
    }
  };

  const saveDoseOnly = async () => {
    if (!dose || !selectedDate) return;
    if (savingRef.current) return;
    savingRef.current = true;
    
    setLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      const { error } = await supabase
        .from('doses')
        .update({
          scheduled_date: dateStr,
          scheduled_time: selectedTime,
          dose_amount: parseFloat(doseAmount),
        })
        .eq('id', dose.id);

      if (error) throw error;

      toast({
        title: "Dose updated",
        description: "This dose has been updated successfully.",
      });
      
      onDoseUpdated();
      
      // Reschedule notifications to pick up the edited time
      await rescheduleNotificationsAfterEdit();
      
      onClose();
    } catch (error) {
      console.error('Error updating dose:', error);
      toast({
        title: "Error",
        description: "Failed to update dose",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setShowScopeChoice(false);
      savingRef.current = false;
    }
  };

  const saveAndUpdateSchedule = async () => {
    if (!dose || !selectedDate) return;
    if (savingRef.current) return;
    savingRef.current = true;
    
    setLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      // Update this specific dose
      const { error: doseError } = await supabase
        .from('doses')
        .update({
          scheduled_date: dateStr,
          scheduled_time: selectedTime,
          dose_amount: parseFloat(doseAmount),
        })
        .eq('id', dose.id);

      if (doseError) throw doseError;

      // Get current compound schedule
      const { data: compound, error: compoundError } = await supabase
        .from('compounds')
        .select('time_of_day')
        .eq('id', dose.compound_id)
        .single();

      if (compoundError) throw compoundError;

      // Update the compound's time_of_day
      // Replace the old time with the new time
      const oldTimeIndex = compound.time_of_day.indexOf(dose.scheduled_time);
      const newTimeOfDay = [...compound.time_of_day];
      if (oldTimeIndex !== -1) {
        newTimeOfDay[oldTimeIndex] = selectedTime;
      } else if (newTimeOfDay.length === 1) {
        newTimeOfDay[0] = selectedTime;
      }

      const { error: updateError } = await supabase
        .from('compounds')
        .update({
          time_of_day: newTimeOfDay,
          intended_dose: parseFloat(doseAmount),
        })
        .eq('id', dose.compound_id);

      if (updateError) throw updateError;

      // Update all future untaken doses with the new time and amount
      // Use gt (strictly greater than) for future dates to avoid re-updating current dose
      const { error: futureDosesError } = await supabase
        .from('doses')
        .update({
          scheduled_time: selectedTime,
          dose_amount: parseFloat(doseAmount),
        })
        .eq('compound_id', dose.compound_id)
        .eq('taken', false)
        .neq('id', dose.id) // Exclude current dose (already updated above)
        .gte('scheduled_date', dateStr);

      if (futureDosesError) throw futureDosesError;

      // Deduplicate: remove any duplicate untaken doses for the same compound + date + time
      const { data: potentialDupes } = await supabase
        .from('doses')
        .select('id, scheduled_date')
        .eq('compound_id', dose.compound_id)
        .eq('taken', false)
        .eq('scheduled_time', selectedTime)
        .gte('scheduled_date', dateStr)
        .order('created_at', { ascending: true });

      if (potentialDupes && potentialDupes.length > 0) {
        // Group by date, keep oldest, delete rest
        const byDate = new Map<string, string[]>();
        potentialDupes.forEach(d => {
          const existing = byDate.get(d.scheduled_date) || [];
          existing.push(d.id);
          byDate.set(d.scheduled_date, existing);
        });
        
        const idsToDelete: string[] = [];
        byDate.forEach(ids => {
          if (ids.length > 1) {
            idsToDelete.push(...ids.slice(1)); // Keep first, delete rest
          }
        });
        
        if (idsToDelete.length > 0) {
          console.log('[DoseEdit] Removing', idsToDelete.length, 'duplicate doses');
          await supabase.from('doses').delete().in('id', idsToDelete);
        }
      }

      toast({
        title: "Schedule updated",
        description: "This dose and future doses have been updated.",
      });
      
      onDoseUpdated();
      
      // Reschedule notifications to pick up the edited schedule
      await rescheduleNotificationsAfterEdit();
      
      onClose();
    } catch (error) {
      console.error('Error updating schedule:', error);
      toast({
        title: "Error",
        description: "Failed to update schedule",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setShowScopeChoice(false);
      savingRef.current = false;
    }
  };

  if (!dose) return null;

  // Scope choice dialog
  if (showScopeChoice) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="px-4 pb-6">
          <DrawerHeader>
            <DrawerTitle>Update scope</DrawerTitle>
          </DrawerHeader>
          <p className="text-sm text-muted-foreground">
            You changed the time. Apply this change to:
          </p>
          <div className="flex flex-col gap-2 mt-4">
            <Button 
              onClick={saveDoseOnly}
              disabled={loading}
              className="justify-start"
            >
              This dose only
            </Button>
            <Button 
              variant="outline"
              onClick={saveAndUpdateSchedule}
              disabled={loading}
              className="justify-start"
            >
              Update schedule for all future doses
            </Button>
          </div>
          <Button 
            variant="ghost" 
            onClick={() => setShowScopeChoice(false)}
            className="mt-2"
          >
            Back
          </Button>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="px-4 pb-6">
        <DrawerHeader>
          <DrawerTitle>Edit {dose.compound_name || 'Dose'}</DrawerTitle>
        </DrawerHeader>
        
        <div className="space-y-4 pt-4">
          {/* Date Picker */}
          <div className="space-y-2">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time Picker */}
          <div className="space-y-2">
            <Label>Time</Label>
            <div className="relative overflow-hidden rounded-md">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
              <Input
                type="time"
                value={selectedTime}
                onChange={(e) => handleTimeChange(e.target.value)}
                className="pl-10 w-full box-border"
              />
            </div>
          </div>

          {/* Dosage */}
          <div className="space-y-2">
            <Label>Dosage ({dose.dose_unit})</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={doseAmount}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '' || /^\d*\.?\d*$/.test(value)) {
                  setDoseAmount(value);
                }
              }}
            />
            {dose.calculated_iu && (
              <p className="text-xs text-muted-foreground">
                ≈ {((parseFloat(doseAmount) / dose.dose_amount) * dose.calculated_iu).toFixed(1)} IU
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={loading || !doseAmount || parseFloat(doseAmount) <= 0}
              className="flex-1"
            >
              {loading ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};