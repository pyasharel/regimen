import { X, Share2, TrendingDown, TrendingUp, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
      const adherenceRate = Math.round(
        (weekData.compounds.reduce((acc, c) => 
          acc + c.dailyDoses.filter(d => d.taken).length, 0) / 
         weekData.compounds.reduce((acc, c) => acc + c.dailyDoses.length, 0)) * 100
      );
      
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md h-[90vh] p-0 gap-0 overflow-hidden">
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
          {/* Compounds Summary */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">This Week's Regimen</h3>
            {weekData.compounds.map((compound, idx) => (
              <div key={idx} className="rounded-lg border border-border/50 p-4 space-y-3">
                <p className="font-medium">{compound.name}</p>
                <div className="grid grid-cols-7 gap-2">
                  {compound.dailyDoses.map((dose, dIdx) => (
                    <div key={dIdx} className="flex flex-col items-center gap-1">
                      <span className="text-[10px] text-muted-foreground uppercase">
                        {dose.day}
                      </span>
                      <div
                        className={`h-8 w-8 rounded-full border-2 flex items-center justify-center text-xs ${
                          dose.taken
                            ? "bg-primary/10 border-primary text-primary"
                            : "border-border/50 text-muted-foreground"
                        }`}
                      >
                        {dose.count}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
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
                <div className="flex items-end gap-2 h-20">
                  {weekData.weightData.map((entry, idx) => {
                    const maxWeight = Math.max(...weekData.weightData.map(d => d.weight));
                    const minWeight = Math.min(...weekData.weightData.map(d => d.weight));
                    const range = maxWeight - minWeight || 1;
                    const height = ((entry.weight - minWeight) / range) * 100;
                    
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[10px] text-muted-foreground">
                          {entry.weight}
                        </span>
                        <div
                          className="w-full bg-primary/20 rounded-t"
                          style={{ height: `${Math.max(height, 20)}%` }}
                        />
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
                  <div key={idx} className="aspect-square rounded-lg overflow-hidden border border-border/50">
                    <img
                      src={photo.url}
                      alt={`Progress ${photo.date}`}
                      className="w-full h-full object-cover"
                    />
                    <p className="text-xs text-muted-foreground text-center mt-1">
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
