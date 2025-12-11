import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type MetricType = "weight" | "energy" | "sleep" | "cravings" | "notes";

interface MetricLogModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metricType: MetricType;
  onSuccess: () => void;
}

// Simple numbered rating buttons
const RatingSelector = ({ 
  value, 
  onChange, 
}: { 
  value: number; 
  onChange: (v: number) => void;
}) => {
  return (
    <div className="flex gap-2 justify-center py-4">
      {[1, 2, 3, 4, 5].map((num) => (
        <button
          key={num}
          type="button"
          onClick={() => onChange(num)}
          className={cn(
            "h-12 w-12 rounded-lg text-base font-medium transition-all active:scale-95",
            num <= value
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          {num}
        </button>
      ))}
    </div>
  );
};

export const MetricLogModal = ({ open, onOpenChange, metricType, onSuccess }: MetricLogModalProps) => {
  const [entryDate, setEntryDate] = useState<Date>(new Date());
  const [weight, setWeight] = useState("");
  const [weightUnit, setWeightUnit] = useState<"lbs" | "kg">("lbs");
  const [rating, setRating] = useState(3);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const dateStr = format(entryDate, 'yyyy-MM-dd');
      let metrics: any = {};

      if (metricType === "weight") {
        const weightValue = parseFloat(weight);
        if (isNaN(weightValue) || weightValue <= 0) {
          toast.error('Please enter a valid weight');
          setLoading(false);
          return;
        }
        const weightInLbs = weightUnit === 'kg' ? weightValue * 2.20462 : weightValue;
        metrics = { weight: weightInLbs };
      } else if (metricType === "energy") {
        metrics = { energy: rating };
      } else if (metricType === "sleep") {
        metrics = { sleep: rating };
      } else if (metricType === "cravings") {
        metrics = { cravings: rating };
      } else if (metricType === "notes") {
        if (!notes.trim()) {
          toast.error('Please enter some notes');
          setLoading(false);
          return;
        }
        metrics = { notes: notes.trim() };
      }

      const { data: existingEntry } = await supabase
        .from('progress_entries')
        .select('id, metrics, category')
        .eq('user_id', user.id)
        .eq('entry_date', dateStr)
        .maybeSingle();

      let error;
      if (existingEntry) {
        const existingMetrics = typeof existingEntry.metrics === 'object' && existingEntry.metrics !== null 
          ? existingEntry.metrics as Record<string, unknown>
          : {};
        const mergedMetrics = { ...existingMetrics, ...metrics };
        ({ error } = await supabase
          .from('progress_entries')
          .update({ 
            metrics: mergedMetrics,
            notes: metricType === "notes" ? notes.trim() : null
          })
          .eq('id', existingEntry.id));
      } else {
        ({ error } = await supabase
          .from('progress_entries')
          .insert([{
            user_id: user.id,
            entry_date: dateStr,
            category: 'metrics',
            metrics,
            notes: metricType === "notes" ? notes.trim() : null
          }]));
      }

      if (error) throw error;

      const labels = {
        weight: 'Weight',
        energy: 'Energy level',
        sleep: 'Sleep quality',
        cravings: 'Cravings level',
        notes: 'Journal entry'
      };
      
      toast.success(`${labels[metricType]} logged successfully`);
      onOpenChange(false);
      resetForm();
      onSuccess();
    } catch (error) {
      console.error('Error logging metric:', error);
      toast.error('Failed to log entry');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setWeight("");
    setRating(3);
    setNotes("");
    setEntryDate(new Date());
  };

  const getTitle = () => {
    switch (metricType) {
      case "weight": return "Log Weight";
      case "energy": return "Log Energy";
      case "sleep": return "Log Last Night's Sleep";
      case "cravings": return "Log Food Cravings";
      case "notes": return "Add Journal Entry";
    }
  };

  const getHelperText = () => {
    switch (metricType) {
      case "energy": return "How's your energy today?";
      case "sleep": return "How well did you sleep last night?";
      case "cravings": return "How are your food cravings? (1 = intense, 5 = none)";
      default: return "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">{getTitle()}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {metricType === "weight" && (
            <div className="flex gap-2">
              <Input
                type="number"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="Enter weight"
                className="flex-1 h-14 text-lg"
              />
              <Select value={weightUnit} onValueChange={(v: "lbs" | "kg") => setWeightUnit(v)}>
                <SelectTrigger className="w-24 h-14">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lbs">lbs</SelectItem>
                  <SelectItem value="kg">kg</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {(metricType === "energy" || metricType === "sleep" || metricType === "cravings") && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">{getHelperText()}</p>
              <RatingSelector value={rating} onChange={setRating} />
              <p className="text-xs text-muted-foreground">
                {metricType === "cravings" ? (
                  <>
                    {rating === 1 && "Intense cravings"}
                    {rating === 2 && "Strong cravings"}
                    {rating === 3 && "Moderate"}
                    {rating === 4 && "Minimal cravings"}
                    {rating === 5 && "No appetite"}
                  </>
                ) : (
                  <>
                    {rating === 1 && "Poor"}
                    {rating === 2 && "Below average"}
                    {rating === 3 && "Average"}
                    {rating === 4 && "Good"}
                    {rating === 5 && "Excellent"}
                  </>
                )}
              </p>
            </div>
          )}

          {metricType === "notes" && (
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How are you feeling? Any side effects, thoughts, or observations..."
              className="min-h-[120px]"
            />
          )}

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              Date
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full h-14 justify-between text-left font-normal",
                    !entryDate && "text-muted-foreground"
                  )}
                >
                  <span>Entry Date</span>
                  <span>{format(entryDate, "MMM d, yyyy")}</span>
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

          <Button
            onClick={handleSave}
            disabled={loading || (metricType === "weight" && !weight) || (metricType === "notes" && !notes.trim())}
            className="w-full h-14 text-base"
          >
            {loading ? 'Saving...' : 'Save Entry'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
