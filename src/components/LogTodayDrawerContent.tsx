import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Scale, Zap, Moon, NotebookPen, Star } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LogTodayDrawerContentProps {
  onSuccess: () => void;
}

// Star rating matching Progress screen style
const StarRating = ({ 
  value, 
  onChange,
  accentColor,
}: { 
  value: number | null; 
  onChange: (v: number | null) => void;
  accentColor: string;
}) => {
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(value === star ? null : star)}
          className="transition-transform hover:scale-110 active:scale-95"
        >
          <Star
            className={cn(
              "w-9 h-9 transition-colors",
              value !== null && star <= value
                ? `fill-current ${accentColor}`
                : "text-muted-foreground/30"
            )}
          />
        </button>
      ))}
    </div>
  );
};

export const LogTodayDrawerContent = ({ onSuccess }: LogTodayDrawerContentProps) => {
  const [entryDate, setEntryDate] = useState<Date>(new Date());
  const [weight, setWeight] = useState("");
  const [weightUnit, setWeightUnit] = useState<"lbs" | "kg">("lbs");
  const [energy, setEnergy] = useState<number | null>(null);
  const [sleep, setSleep] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingEntry, setLoadingEntry] = useState(false);

  // Load existing entry when date changes
  useEffect(() => {
    const loadExistingEntry = async () => {
      setLoadingEntry(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoadingEntry(false);
          return;
        }

        const dateStr = format(entryDate, 'yyyy-MM-dd');
        const { data: existingEntry } = await supabase
          .from('progress_entries')
          .select('*')
          .eq('user_id', user.id)
          .eq('entry_date', dateStr)
          .maybeSingle();

        // Reset all fields first
        setWeight("");
        setEnergy(null);
        setSleep(null);
        setNotes("");

        if (existingEntry && existingEntry.metrics) {
          const metrics = existingEntry.metrics as Record<string, number> | null;
          if (metrics) {
            if (typeof metrics.weight === 'number') {
              const displayWeight = weightUnit === 'kg' 
                ? (metrics.weight / 2.20462).toFixed(1) 
                : metrics.weight.toString();
              setWeight(displayWeight);
            }
            if (typeof metrics.energy === 'number') {
              setEnergy(metrics.energy);
            }
            if (typeof metrics.sleep === 'number') {
              setSleep(metrics.sleep);
            }
          }
          if (existingEntry.notes) {
            setNotes(existingEntry.notes);
          }
        }
      } catch (error) {
        console.error('Error loading entry:', error);
      } finally {
        setLoadingEntry(false);
      }
    };

    loadExistingEntry();
  }, [entryDate, weightUnit]);

  const handleSave = async () => {
    if (!weight && energy === null && sleep === null && !notes.trim()) {
      toast.error('Please fill in at least one field');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const dateStr = format(entryDate, 'yyyy-MM-dd');
      const metrics: Record<string, number | string> = {};

      if (weight) {
        const weightValue = parseFloat(weight);
        if (!isNaN(weightValue) && weightValue > 0) {
          const weightInLbs = weightUnit === 'kg' ? weightValue * 2.20462 : weightValue;
          metrics.weight = weightInLbs;
        }
      }
      
      if (energy !== null) metrics.energy = energy;
      if (sleep !== null) metrics.sleep = sleep;

      const { data: existingEntry } = await supabase
        .from('progress_entries')
        .select('id, metrics')
        .eq('user_id', user.id)
        .eq('entry_date', dateStr)
        .maybeSingle();

      let error;
      if (existingEntry) {
        const existingMetrics = typeof existingEntry.metrics === 'object' && existingEntry.metrics !== null 
          ? existingEntry.metrics as Record<string, unknown>
          : {};
        const mergedMetrics = { ...existingMetrics, ...metrics } as Record<string, unknown>;
        ({ error } = await supabase
          .from('progress_entries')
          .update({ 
            metrics: mergedMetrics as unknown as Record<string, number | string>,
            notes: notes.trim() || null
          })
          .eq('id', existingEntry.id));
      } else {
        ({ error } = await supabase
          .from('progress_entries')
          .insert([{
            user_id: user.id,
            entry_date: dateStr,
            category: 'metrics',
            metrics: Object.keys(metrics).length > 0 ? metrics : null,
            notes: notes.trim() || null
          }]));
      }

      if (error) throw error;

      const logged: string[] = [];
      if (weight) logged.push('weight');
      if (energy !== null) logged.push('energy');
      if (sleep !== null) logged.push('sleep');
      if (notes.trim()) logged.push('notes');
      
      toast.success(`Logged: ${logged.join(', ')}`);
      onSuccess();
    } catch (error) {
      console.error('Error logging:', error);
      toast.error('Failed to save entry');
    } finally {
      setLoading(false);
    }
  };

  const hasContent = weight || energy !== null || sleep !== null || notes.trim();

  return (
    <div className="space-y-5">
      {/* Weight Section - Primary/Coral */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm font-medium">
          <Scale className="w-4 h-4 text-primary" />
          Weight
        </Label>
        <div className="flex gap-2">
          <Input
            type="number"
            step="0.1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder={loadingEntry ? "Loading..." : "Enter weight"}
            className="flex-1 h-11"
            disabled={loadingEntry}
          />
          <Select value={weightUnit} onValueChange={(v: "lbs" | "kg") => setWeightUnit(v)}>
            <SelectTrigger className="w-20 h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lbs">lbs</SelectItem>
              <SelectItem value="kg">kg</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Energy Section - Coral/Rose like chart */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm font-medium">
          <Zap className="w-4 h-4" style={{ color: 'hsl(350, 70%, 60%)' }} />
          Energy
        </Label>
        <StarRating 
          value={energy} 
          onChange={setEnergy} 
          accentColor="text-[hsl(350,70%,60%)]"
        />
      </div>

      {/* Sleep Section - Purple like chart */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm font-medium">
          <Moon className="w-4 h-4" style={{ color: 'hsl(270, 60%, 55%)' }} />
          Sleep
        </Label>
        <StarRating 
          value={sleep} 
          onChange={setSleep}
          accentColor="text-[hsl(270,60%,55%)]"
        />
      </div>

      {/* Notes Section */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm font-medium">
          <NotebookPen className="w-4 h-4 text-muted-foreground" />
          Notes
        </Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={loadingEntry ? "Loading..." : "How are you feeling?"}
          className="min-h-[70px] resize-none"
          disabled={loadingEntry}
        />
      </div>

      {/* Date Section */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm font-medium">
          <CalendarIcon className="w-4 h-4" />
          Date
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full h-11 justify-between text-left font-normal",
                !entryDate && "text-muted-foreground"
              )}
            >
              <span>Entry Date</span>
              <span className="text-muted-foreground">{format(entryDate, "MMM d, yyyy")}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={entryDate}
              onSelect={(date) => date && setEntryDate(date)}
              disabled={(date) => date > new Date()}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Save Button */}
      <Button
        onClick={handleSave}
        disabled={loading || loadingEntry || !hasContent}
        className="w-full h-11 text-base"
      >
        {loading ? 'Saving...' : 'Save Entry'}
      </Button>
    </div>
  );
};
