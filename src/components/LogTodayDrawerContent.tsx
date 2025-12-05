import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Scale, Zap, Moon, NotebookPen } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LogTodayDrawerContentProps {
  onSuccess: () => void;
}

const RatingSelector = ({ 
  value, 
  onChange, 
}: { 
  value: number | null; 
  onChange: (v: number | null) => void;
}) => {
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((num) => (
        <button
          key={num}
          type="button"
          onClick={() => onChange(value === num ? null : num)}
          className={cn(
            "h-11 w-11 rounded-lg text-base font-medium transition-all",
            value === num
              ? "bg-primary text-primary-foreground"
              : "bg-muted/50 text-muted-foreground hover:bg-muted"
          )}
        >
          {num}
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
    setNotes("");
    setEntryDate(new Date());
  };

  const hasContent = weight || energy !== null || sleep !== null || notes.trim();

  return (
    <div className="space-y-5">
      {/* Weight Section */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm font-medium">
          <Scale className="w-4 h-4 text-coral" />
          Weight
        </Label>
        <div className="flex gap-2">
          <Input
            type="number"
            step="0.1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="Enter weight"
            className="flex-1 h-11"
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

      {/* Energy Section */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm font-medium">
          <Zap className="w-4 h-4 text-amber-500" />
          Energy
        </Label>
        <RatingSelector value={energy} onChange={setEnergy} />
      </div>

      {/* Sleep Section */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm font-medium">
          <Moon className="w-4 h-4 text-indigo-400" />
          Sleep
        </Label>
        <RatingSelector value={sleep} onChange={setSleep} />
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
          placeholder="How are you feeling?"
          className="min-h-[70px] resize-none"
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
        disabled={loading || !hasContent}
        className="w-full h-11 text-base"
      >
        {loading ? 'Saving...' : 'Save Entry'}
      </Button>
    </div>
  );
};
