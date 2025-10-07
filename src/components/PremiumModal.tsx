import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Clock, Calendar, Camera, FileDown, Zap } from "lucide-react";

interface PremiumModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PremiumModal = ({ open, onOpenChange }: PremiumModalProps) => {
  const features = [
    {
      icon: Clock,
      title: "Custom Notification Times",
      description: "Set precise times for your medication reminders instead of just Morning/Evening"
    },
    {
      icon: Calendar,
      title: "Advanced Scheduling",
      description: "Create complex dosing schedules with cycles and titration protocols"
    },
    {
      icon: Camera,
      title: "Progress Photos & AI Analysis",
      description: "Upload transformation photos and get AI-powered body composition analysis"
    },
    {
      icon: FileDown,
      title: "Data Export",
      description: "Download your complete medication and progress history as CSV or PDF"
    },
    {
      icon: Zap,
      title: "Priority Support",
      description: "Get faster responses and dedicated support from our team"
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary">
              <Crown className="h-5 w-5 text-white" />
            </div>
            <DialogTitle className="text-2xl">Unlock Premium</DialogTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Take your medication tracking to the next level
          </p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="flex gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">{feature.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{feature.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-3 pt-4 border-t border-border">
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-primary">$9.99/month</div>
            <div className="text-xs text-muted-foreground mt-1">or $99/year (save 17%)</div>
          </div>

          <Button className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90">
            Start 14-Day Free Trial
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Cancel anytime. No commitment required.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
