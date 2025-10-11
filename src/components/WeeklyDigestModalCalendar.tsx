import { X, Share2, TrendingDown, TrendingUp, Calendar, Pill } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Share } from "@capacitor/share";
import { useToast } from "@/hooks/use-toast";

interface WeeklyDigestModalProps {
  open: boolean;
  onClose: () => void;
  weekData: {
    startDate: Date;
    endDate: Date;
    compounds: Array<{
      name: string;
      dailyDoses: Array<{ day: string; count: number; taken: boolean }>;
    }>;
    photos: Array<{ date: string; url: string }>;
    weightData: Array<{ date: string; weight: number }>;
  };
}

export const WeeklyDigestModal = ({ open, onClose, weekData }: WeeklyDigestModalProps) => {
  const { toast } = useToast();

  const handleShare = async () => {
    try {
      const totalDoses = weekData.compounds.reduce((acc, c) => acc + c.dailyDoses.length, 0);
      const takenDoses = weekData.compounds.reduce((acc, c) => 
        acc + c.dailyDoses.filter(d => d.taken).length, 0);
      const adherenceRate = totalDoses > 0 ? Math.round((takenDoses / totalDoses) * 100) : 0;
      
      await Share.share({
        title: "My Weekly Progress",
        text: `This week I stayed ${adherenceRate}% consistent with my regimen! 💪`,
        dialogTitle: "Share Your Progress",
      });
    } catch (error) {
      console.error("Share failed:", error);
    }
  };

  const weekStart = weekData.startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const weekEnd = weekData.endDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const weightTrend = weekData.weightData.length >= 2 
    ? weekData.weightData[weekData.weightData.length - 1].weight - weekData.weightData[0].weight
    : 0;

  // Organize data by day
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dailyData = daysOfWeek.map((day, dayIndex) => {
    const compoundsForDay = weekData.compounds.map(compound => {
      const doseForDay = compound.dailyDoses.find(d => d.day === day);
      return {
        name: compound.name,
        dose: doseForDay || { day, count: 0, taken: false }
      };
    }).filter(c => c.dose.count > 0);

    return {
      day,
      compounds: compoundsForDay
    };
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md h-[90vh] p-0 gap-0 overflow-hidden">
        <DialogTitle className="sr-only">Weekly Digest</DialogTitle>
        <DialogDescription className="sr-only">
          Your weekly progress summary including regimen adherence, weight tracking, and progress photos
        </DialogDescription>
        
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-br from-primary/10 to-primary/5 border-b border-border px-6 py-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">{weekStart} - {weekEnd}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <h2 className="text-2xl font-bold">Weekly Digest</h2>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Day-by-Day Calendar */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">This Week's Regimen</h3>
            <div className="space-y-3">
              {dailyData.map((dayData, idx) => (
                <div key={idx} className="rounded-lg border border-border/50 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-sm uppercase text-muted-foreground">
                      {dayData.day}
                    </span>
                    {dayData.compounds.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {dayData.compounds.filter(c => c.dose.taken).length}/{dayData.compounds.length} taken
                      </span>
                    )}
                  </div>
                  
                  {dayData.compounds.length > 0 ? (
                    <div className="space-y-2">
                      {dayData.compounds.map((compound, cIdx) => (
                        <div 
                          key={cIdx}
                          className={`flex items-center justify-between p-2 rounded-md ${
                            compound.dose.taken 
                              ? "bg-primary/10 border border-primary/20" 
                              : "bg-muted/50"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Pill className={`h-4 w-4 ${
                              compound.dose.taken ? "text-primary" : "text-muted-foreground"
                            }`} />
                            <span className={`text-sm ${
                              compound.dose.taken ? "text-foreground font-medium" : "text-muted-foreground"
                            }`}>
                              {compound.name}
                            </span>
                          </div>
                          <span className={`text-xs font-medium ${
                            compound.dose.taken ? "text-primary" : "text-muted-foreground"
                          }`}>
                            {compound.dose.count}x
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No doses scheduled</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Weight Trend */}
          {weekData.weightData.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Weight Tracking</h3>
              <div className="rounded-lg border border-border/50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">This Week</span>
                  <div className="flex items-center gap-2">
                    {weightTrend !== 0 && (
                      weightTrend < 0 ? (
                        <TrendingDown className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingUp className="h-4 w-4 text-orange-500" />
                      )
                    )}
                    <span className={`font-semibold ${
                      weightTrend < 0 ? "text-green-500" : weightTrend > 0 ? "text-orange-500" : ""
                    }`}>
                      {weightTrend !== 0 && (weightTrend > 0 ? "+" : "")}
                      {weightTrend.toFixed(1)} lbs
                    </span>
                  </div>
                </div>
                <div className="flex items-end justify-between gap-2 h-24">
                  {weekData.weightData.map((entry, idx) => {
                    const maxWeight = Math.max(...weekData.weightData.map(d => d.weight));
                    const minWeight = Math.min(...weekData.weightData.map(d => d.weight));
                    const range = maxWeight - minWeight || 1;
                    const normalizedHeight = range > 0 ? ((entry.weight - minWeight) / range) * 80 + 20 : 50;
                    
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                        <div
                          className="w-full bg-primary rounded-t min-h-[8px]"
                          style={{ height: `${normalizedHeight}%` }}
                        />
                        <span className="text-[10px] text-muted-foreground font-medium">
                          {Math.round(entry.weight)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Progress Photos */}
          {weekData.photos.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Progress Photos</h3>
              <div className="grid grid-cols-2 gap-3">
                {weekData.photos.map((photo, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="aspect-square rounded-lg overflow-hidden border border-border/50">
                      <img
                        src={photo.url}
                        alt={`Progress ${photo.date}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      {new Date(photo.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t border-border bg-background/95 backdrop-blur p-4">
          <Button
            onClick={handleShare}
            className="w-full"
            size="lg"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share Progress
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};