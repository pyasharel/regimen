import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Scale, Zap, Moon, NotebookPen, Utensils } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LogTodayModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const RatingSelector = ({ 
  value, 
  onChange, 
  label,
  disabled
}: { 
  value: number | null; 
  onChange: (v: number | null) => void;
  label: string;
  disabled?: boolean;
}) => {
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((num) => (
        <button
          key={num}
          type="button"
          onClick={() => onChange(value === num ? null : num)}
          disabled={disabled}
          className={cn(
            "h-11 w-11 rounded-lg text-base font-medium transition-all",
            value === num
              ? "bg-primary text-primary-foreground"
              : "bg-muted/50 text-muted-foreground hover:bg-muted",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          {num}
        </button>
      ))}
    </div>
  );
};

export const LogTodayModal = ({ open, onOpenChange, onSuccess }: LogTodayModalProps) => {
  const [entryDate, setEntryDate] = useState<Date>(new Date());
  const [weight, setWeight] = useState("");
  const [weightUnit, setWeightUnit] = useState<"lbs" | "kg">("lbs");
  const [energy, setEnergy] = useState<number | null>(null);
  const [sleep, setSleep] = useState<number | null>(null);
  const [cravings, setCravings] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingEntry, setLoadingEntry] = useState(false);
  const [notesKeyboardOpen, setNotesKeyboardOpen] = useState(false);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  // Load existing entry when date changes or modal opens
  useEffect(() => {
    if (!open) return;
    
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

        // Reset all fields first - nothing pre-selected
        setWeight("");
        setEnergy(null);
        setSleep(null);
        setCravings(null);
        setNotes("");

        // Then load existing data if available
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
            if (typeof metrics.cravings === 'number') {
              setCravings(metrics.cravings);
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
  }, [entryDate, weightUnit, open]);

  const handleSave = async () => {
    // Check if at least one field is filled
    if (!weight && energy === null && sleep === null && cravings === null && !notes.trim()) {
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
      
      if (energy !== null) {
        metrics.energy = energy;
      }
      
      if (sleep !== null) {
        metrics.sleep = sleep;
      }
      
      if (cravings !== null) {
        metrics.cravings = cravings;
      }

      // Check if entry exists for this date
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
      if (cravings !== null) logged.push('cravings');
      if (notes.trim()) logged.push('notes');
      
      toast.success(`Logged: ${logged.join(', ')}`);
      onOpenChange(false);
      resetForm();
      onSuccess();
    } catch (error) {
      console.error('Error logging:', error);
      toast.error('Failed to save entry');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setWeight("");
    setEnergy(null);
    setSleep(null);
    setCravings(null);
    setNotes("");
    setEntryDate(new Date());
  };

  const hasContent = weight || energy !== null || sleep !== null || cravings !== null || notes.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0 max-h-[85vh] overflow-hidden">
        <DialogHeader className="p-6 pb-4 flex-shrink-0">
          <DialogTitle className="text-xl flex items-center gap-2">
            <NotebookPen className="w-5 h-5 text-primary" />
            Log Today
          </DialogTitle>
          <p className="text-sm text-muted-foreground">Track your daily metrics</p>
        </DialogHeader>

        <div className={cn("overflow-y-auto px-6 space-y-6 max-h-[50vh]", notesKeyboardOpen && "pb-48")}>
          {/* Weight Section */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Scale className="w-4 h-4 text-primary" />
              Current weight
            </Label>
            <div className="flex gap-2">
              <Input
                type="number"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder={loadingEntry ? "..." : "Weight"}
                className="w-28 h-12"
                disabled={loadingEntry}
              />
              <Select value={weightUnit} onValueChange={(v: "lbs" | "kg") => setWeightUnit(v)}>
                <SelectTrigger className="w-20 h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lbs">lbs</SelectItem>
                  <SelectItem value="kg">kg</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Energy Section */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Zap className="w-4 h-4 text-amber-500" />
              Energy level
            </Label>
            <RatingSelector value={energy} onChange={setEnergy} label="Energy" disabled={loadingEntry} />
            {energy !== null && (
              <p className="text-xs text-muted-foreground">
                {energy === 1 && "Low energy"}
                {energy === 2 && "Below average"}
                {energy === 3 && "Average"}
                {energy === 4 && "Good energy"}
                {energy === 5 && "Excellent!"}
              </p>
            )}
          </div>

          {/* Sleep Section */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Moon className="w-4 h-4 text-indigo-400" />
              Sleep quality
            </Label>
            <RatingSelector value={sleep} onChange={setSleep} label="Sleep" disabled={loadingEntry} />
            {sleep !== null && (
              <p className="text-xs text-muted-foreground">
                {sleep === 1 && "Poor sleep"}
                {sleep === 2 && "Below average"}
                {sleep === 3 && "Average"}
                {sleep === 4 && "Good sleep"}
                {sleep === 5 && "Excellent!"}
              </p>
            )}
          </div>

          {/* Cravings Section */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Utensils className="w-4 h-4 text-emerald-500" />
              Food cravings
            </Label>
            <RatingSelector value={cravings} onChange={setCravings} label="Cravings" disabled={loadingEntry} />
            {cravings !== null && (
              <p className="text-xs text-muted-foreground">
                {cravings === 1 && "No cravings"}
                {cravings === 2 && "Minimal cravings"}
                {cravings === 3 && "Moderate"}
                {cravings === 4 && "Strong cravings"}
                {cravings === 5 && "Intense cravings"}
              </p>
            )}
          </div>

          {/* Notes Section */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <NotebookPen className="w-4 h-4 text-muted-foreground" />
              Quick notes
            </Label>
            <Textarea
              ref={notesRef}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={loadingEntry ? "Loading..." : "What's going on today?"}
              className="min-h-[80px] resize-none"
              disabled={loadingEntry}
              onFocus={() => {
                setNotesKeyboardOpen(true);
                setTimeout(() => {
                  notesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 300);
              }}
              onBlur={() => setNotesKeyboardOpen(false)}
            />
          </div>

          {/* Date Section */}
          <div className="space-y-2 pb-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <CalendarIcon className="w-4 h-4" />
              Date
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full h-12 justify-between text-left font-normal",
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
        </div>

        {/* Fixed Footer */}
        <div className="p-6 pt-4 border-t border-border/50 flex-shrink-0">
          <Button
            onClick={handleSave}
            disabled={loading || loadingEntry || !hasContent}
            className="w-full h-12 text-base"
          >
            {loading ? 'Saving...' : 'Save Entry'}
          </Button>
          
          {!hasContent && !loadingEntry && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              Fill in at least one field to save
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
