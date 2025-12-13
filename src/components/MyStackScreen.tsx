import { useNavigate } from "react-router-dom";
import { Plus, MoreVertical, Pencil, Trash2, CheckCircle, RotateCcw, Activity, TrendingUp, ChevronRight, Share2 } from "lucide-react";
import { PremiumDiamond } from "@/components/ui/icons/PremiumDiamond";
import { BottomNavigation } from "@/components/BottomNavigation";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDose } from "@/utils/doseUtils";
import { calculateCycleStatus } from "@/utils/cycleUtils";
import { Progress } from "@/components/ui/progress";
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { hasHalfLifeTracking } from "@/utils/halfLifeData";
import { StackShareCard } from "@/components/ShareCard";
import { shareElementAsImage } from "@/utils/visualShare";
import { trackCompoundDeleted, trackCompoundViewed } from "@/utils/analytics";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MainHeader } from "@/components/MainHeader";

interface Compound {
  id: string;
  name: string;
  intended_dose: number;
  dose_unit: string;
  calculated_iu: number | null;
  calculated_ml: number | null;
  schedule_type: string;
  schedule_days: string[] | null;
  time_of_day: string[];
  start_date: string;
  is_active: boolean;
  created_at: string;
  has_cycles: boolean;
  cycle_weeks_on: number | null;
  cycle_weeks_off: number | null;
}

export const MyStackScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [compounds, setCompounds] = useState<Compound[]>([]);
  const [loading, setLoading] = useState(true);
  const [weeklyDoses, setWeeklyDoses] = useState(0);
  const [adherenceRate, setAdherenceRate] = useState(0);
  const shareCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadCompounds();
    loadWeeklyStats();
  }, []);

  const loadCompounds = async () => {
    try {
      const { data, error } = await supabase
        .from('compounds')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCompounds(data || []);
    } catch (error) {
      console.error('Error loading compounds:', error);
      toast({
        title: "Error loading compounds",
        description: error instanceof Error ? error.message : "Failed to fetch your compounds",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadWeeklyStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get doses from the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

      const { data: doses, error } = await supabase
        .from('doses')
        .select('taken, scheduled_date')
        .eq('user_id', user.id)
        .gte('scheduled_date', sevenDaysAgoStr);

      if (error) throw error;

      const totalDoses = doses?.length || 0;
      const takenDoses = doses?.filter(d => d.taken).length || 0;
      
      setWeeklyDoses(takenDoses);
      setAdherenceRate(totalDoses > 0 ? Math.round((takenDoses / totalDoses) * 100) : 0);
    } catch (error) {
      console.error('Error loading weekly stats:', error);
      toast({
        title: "Error loading stats",
        description: "Failed to fetch weekly statistics",
        variant: "destructive"
      });
    }
  };

  const markComplete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('compounds')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Compound marked inactive",
        description: "Moved to inactive section"
      });

      await loadCompounds();
      await loadWeeklyStats();
    } catch (error) {
      console.error('Error marking complete:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update compound",
        variant: "destructive"
      });
    }
  };

  const reactivateCompound = async (id: string) => {
    try {
      const { error } = await supabase
        .from('compounds')
        .update({ is_active: true })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Compound reactivated",
        description: "Moved back to active section"
      });

      await loadCompounds();
      await loadWeeklyStats();
    } catch (error) {
      console.error('Error reactivating:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reactivate compound",
        variant: "destructive"
      });
    }
  };

  const deleteCompound = async (id: string) => {
    if (!confirm('Are you sure you want to delete this compound?')) return;

    // Find compound name for analytics before deleting
    const compound = compounds.find(c => c.id === id);

    try {
      const { error } = await supabase
        .from('compounds')
        .delete()
        .eq('id', id);

      if (error) throw error;

      if (compound) {
        trackCompoundDeleted(compound.name);
      }

      toast({
        title: "Compound deleted",
        description: "Successfully removed from your stack"
      });

      await loadCompounds();
      await loadWeeklyStats();
    } catch (error) {
      console.error('Error deleting compound:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete compound",
        variant: "destructive"
      });
    }
  };

  const activeCompounds = compounds.filter(c => c.is_active);
  const inactiveCompounds = compounds.filter(c => !c.is_active);

  const getDaysActive = (startDate: string) => {
    const start = new Date(startDate + 'T00:00:00'); // Parse as local date
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Set to start of today
    start.setHours(0, 0, 0, 0); // Set to start of start date
    
    const days = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    // Check if medication starts in the future
    if (days <= 0) {
      const futureDays = Math.abs(days) + 1;
      return `Starts in ${futureDays}d`;
    }
    
    // Show in months if > 30 days
    if (days > 30) {
      const months = Math.floor(days / 30);
      const remainingDays = days % 30;
      if (remainingDays === 0) {
        return `${months}mo`;
      }
      return `${months}mo ${remainingDays}d`;
    }
    
    return `${days}d`;
  };

  const formatTime = (time: string) => {
    // Handle preset times
    if (time === 'Morning') return '8:00 AM';
    if (time === 'Afternoon') return '2:00 PM';
    if (time === 'Evening') return '6:00 PM';
    
    // Handle custom time in HH:MM format (24-hour)
    const customTimeMatch = time.match(/^(\d{1,2}):(\d{2})$/);
    if (customTimeMatch) {
      let hours = parseInt(customTimeMatch[1]);
      const minutes = customTimeMatch[2];
      const period = hours >= 12 ? 'PM' : 'AM';
      hours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      return `${hours}:${minutes} ${period}`;
    }
    
    return time; // Fallback to original
  };

  const getScheduleDisplay = (compound: Compound) => {
    if ((compound.schedule_type === 'Specific day(s)' || compound.schedule_type === 'Specific day of the week') && compound.schedule_days) {
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const selectedDays = compound.schedule_days.map(d => dayNames[typeof d === 'string' ? parseInt(d) : d]);
      return selectedDays.join(', ');
    }
    
    // Handle legacy "Every X Days" - if it's literally "Every X Days", show it friendlier
    if (compound.schedule_type === 'Every X Days') {
      return 'Custom Interval';
    }
    
    // For newer format "Every 3 Days", it's already in the right format
    return compound.schedule_type;
  };

  const handleEdit = (compound: Compound) => {
    // Navigate to add-compound screen with compound data as state
    navigate('/add-compound', { state: { editingCompound: compound } });
  };

  const triggerHaptic = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        await Haptics.impact({ style: ImpactStyle.Light });
      } else if ('vibrate' in navigator) {
        navigator.vibrate(30);
      }
    } catch (err) {
      console.log('Haptic failed:', err);
    }
  };

  const handleShareStack = async () => {
    if (activeCompounds.length === 0) {
      toast({
        title: "Nothing to share",
        description: "Add some compounds to share your stack",
      });
      return;
    }

    triggerHaptic();
    
    // Try visual share first
    if (shareCardRef.current) {
      const success = await shareElementAsImage(shareCardRef.current, 'my-stack.png');
      if (success) return;
    }
    
    // Fallback to text share
    const stackText = activeCompounds
      .map(c => `• ${c.name}: ${formatDose(c.intended_dose, c.dose_unit)} (${getScheduleDisplay(c)})`)
      .join('\n');
    
    const shareText = `My Stack 💊\n\n${stackText}\n\nTrack your protocol at regimen.app`;
    
    try {
      await Share.share({
        title: 'My Stack',
        text: shareText,
        url: 'https://regimen.app',
        dialogTitle: 'Share your stack',
      });
    } catch (err) {
      console.log('Share cancelled or failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col">
        <div className="flex-1 min-h-0 scroll-container pb-24">
          <MainHeader title="My Stack" />
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="h-32 bg-muted animate-pulse rounded-xl" />
              <div className="h-32 bg-muted animate-pulse rounded-xl" />
            </div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-muted animate-pulse rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }
 
  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      {/* Scrollable Content - Header inside scroll area */}
      <div className="flex-1 min-h-0 scroll-container pb-24">
        {/* Header */}
        <MainHeader title="My Stack" />
        {/* Dashboard Stats - Single Row */}
        <div className="p-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Active Compounds */}
            <div className="rounded-xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-4 shadow-lg shadow-primary/20">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
                <span className="text-xs font-semibold text-white/90 uppercase tracking-wider">Active</span>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white">{activeCompounds.length}</div>
                <div className="text-xs text-white/80 mt-1">
                  {activeCompounds.length === 1 ? 'Medication' : 'Medications'}
                </div>
              </div>
            </div>

            {/* Inactive Compounds */}
            <div className="rounded-xl bg-muted border border-border p-4 shadow-sm">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Inactive</span>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-muted-foreground">{inactiveCompounds.length}</div>
                <div className="text-xs text-muted-foreground/80 mt-1">
                  {inactiveCompounds.length === 1 ? 'Medication' : 'Medications'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Active Compounds */}
        <div className="space-y-4 px-4 pb-4">
          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Active
            </h2>
          
          {activeCompounds.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <button
                onClick={() => {
                  triggerHaptic();
                  navigate("/add-compound");
                }}
                className="rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 p-8 hover:bg-primary/10 hover:border-primary/60 active:scale-[0.98] transition-all w-full max-w-md"
              >
                <div className="flex flex-col items-center text-center">
                  <h3 className="text-xl font-bold mb-6 text-foreground">
                    Track Your First Compound
                  </h3>
                  
                  {/* Single CTA button */}
                  <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-white text-base font-semibold shadow-lg hover:shadow-xl transition-all">
                    <Plus className="w-5 h-5" strokeWidth={2.5} />
                    <span>Add Compound</span>
                  </div>
                </div>
              </button>
            </div>
          ) : (
            activeCompounds.map((compound) => {
              const hasHalfLife = hasHalfLifeTracking(compound.name);
              
              return (
              <div
                key={compound.id}
                className="overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/12 via-primary/8 to-primary/5 shadow-md hover:shadow-lg hover:border-primary/40 transition-all animate-slide-up cursor-pointer"
                onClick={() => {
                  triggerHaptic();
                  navigate(`/stack/${compound.id}`);
                }}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="mt-1.5 h-2 w-2 rounded-full bg-[#FF6B6B] shadow-sm shadow-[#FF6B6B]/50 animate-pulse flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-bold text-foreground leading-tight">{compound.name}</h3>
                          {hasHalfLife && (
                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary/15 text-primary flex-shrink-0">
                              <Activity className="h-3 w-3" />
                              <span className="text-[10px] font-semibold">LEVELS</span>
                            </div>
                          )}
                        </div>
                        <p className="mt-1.5 text-sm text-muted-foreground">
                          {formatDose(compound.intended_dose, compound.dose_unit)}
                          {compound.calculated_iu && ` • ${compound.calculated_iu} IU`}
                          {compound.calculated_ml && ` • Draw ${compound.calculated_ml} mL`}
                          {' • '}{compound.time_of_day.map(t => formatTime(t)).join(', ')}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {getScheduleDisplay(compound)} • Active {getDaysActive(compound.start_date)}
                        </p>
                        
                        {/* Cycle Status or Ongoing Status */}
                        {(() => {
                          // If compound has cycles, show cycle status
                          if (compound.has_cycles) {
                            const cycleStatus = calculateCycleStatus(
                              compound.start_date,
                              compound.cycle_weeks_on,
                              compound.cycle_weeks_off
                            );
                            
                            if (!cycleStatus) return null;
                            
                            // For one-time cycles that have ended, don't show status
                            if (!compound.cycle_weeks_off && !cycleStatus.isInCycle) return null;
                            
                            const isOnCycle = cycleStatus.currentPhase === 'on';
                            
                            return (
                              <div className="mt-3 pt-3 border-t border-border/50">
                                <div className="flex items-center justify-between gap-2 mb-2">
                                  <div className="flex items-center gap-2">
                                    <div className={`h-2 w-2 rounded-full flex-shrink-0 ${
                                      isOnCycle 
                                        ? 'bg-[#FF6B6B] animate-pulse' 
                                        : 'bg-muted-foreground'
                                    }`} />
                                    <span className={`text-xs font-semibold uppercase tracking-wider ${
                                      isOnCycle 
                                        ? 'text-[#FF6B6B]' 
                                        : 'text-muted-foreground'
                                    }`}>
                                      {isOnCycle ? 'ON CYCLE' : 'OFF CYCLE'}
                                    </span>
                                  </div>
                                  <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                                    Day {cycleStatus.daysIntoPhase} of {cycleStatus.totalDaysInPhase}
                                  </span>
                                </div>
                                <Progress 
                                  value={cycleStatus.progressPercentage} 
                                  className={`h-1.5 ${isOnCycle ? '[&>div]:bg-[#FF6B6B]' : '[&>div]:bg-[#666666] bg-[#333333]'}`}
                                />
                              </div>
                            );
                          }
                          
                          // If no cycles, show as ONGOING
                          const startDate = new Date(compound.start_date + 'T00:00:00');
                          const now = new Date();
                          now.setHours(0, 0, 0, 0);
                          startDate.setHours(0, 0, 0, 0);
                          const daysActive = Math.max(1, Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
                          
                          return (
                            <div className="mt-3 pt-3 border-t border-border/50">
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2">
                                  <div className="h-2 w-2 rounded-full flex-shrink-0 bg-[#FF6B6B] animate-pulse" />
                                  <span className="text-xs font-semibold uppercase tracking-wider text-[#FF6B6B]">
                                    ONGOING
                                  </span>
                                </div>
                              </div>
                              <Progress 
                                value={100} 
                                className="h-1.5 [&>div]:bg-[#FF6B6B]"
                              />
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <button className="rounded-lg p-2 hover:bg-muted/50 transition-colors">
                            <MoreVertical className="h-5 w-5 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(compound); }}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); markComplete(compound.id); }}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Mark Inactive
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={(e) => { e.stopPropagation(); deleteCompound(compound.id); }}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <ChevronRight className="h-5 w-5 text-muted-foreground/50" />
                    </div>
                  </div>
                </div>
              </div>
            );
          }))}
        </div>

        {/* Inactive Compounds */}
        <div className="space-y-3 pt-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Inactive ({inactiveCompounds.length})
          </h2>
          
          {inactiveCompounds.map((compound) => (
            <div
              key={compound.id}
              className="overflow-hidden rounded-2xl border border-border bg-muted shadow-sm opacity-70 hover:opacity-85 transition-opacity cursor-pointer"
              onClick={() => {
                triggerHaptic();
                navigate(`/stack/${compound.id}`);
              }}
            >
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-2 w-2 rounded-full bg-muted-foreground/60" />
                    <div>
                      <h3 className="font-bold text-muted-foreground">{compound.name}</h3>
                      <p className="mt-1 text-sm text-muted-foreground/80">
                        {formatDose(compound.intended_dose, compound.dose_unit)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground/70">
                        {getScheduleDisplay(compound)} • Inactive
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <button className="rounded-lg p-2 hover:bg-muted/50 transition-colors">
                          <MoreVertical className="h-5 w-5 text-muted-foreground/70" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(compound); }}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); reactivateCompound(compound.id); }}>
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Reactivate
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => { e.stopPropagation(); deleteCompound(compound.id); }}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <ChevronRight className="h-5 w-5 text-muted-foreground/30" />
                  </div>
                </div>
              </div>
            </div>
          ))}
          </div>
        </div>

        {/* Share Link - Only show when has active compounds */}
        {activeCompounds.length > 0 && (
          <div className="px-4 pb-4">
            <button
              onClick={handleShareStack}
              className="w-full flex items-center justify-center gap-2 py-2 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span className="text-xs">Share Stack</span>
            </button>
          </div>
        )}
      </div>
      {/* End of scroll-container */}

      {/* FAB Button - Only show when has active compounds */}
      {activeCompounds.length > 0 && (
        <button
          onClick={() => {
            triggerHaptic();
            navigate("/add-compound");
          }}
          className="fixed right-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground ring-[3px] ring-white/80 dark:ring-black/80 transition-all hover:scale-105 active:scale-95"
          style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}
        >
          <Plus className="h-6 w-6" />
        </button>
      )}

      <BottomNavigation />

      {/* Hidden share card for image generation */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <StackShareCard
          ref={shareCardRef}
          compounds={activeCompounds.map(c => ({
            name: c.name,
            dose: formatDose(c.intended_dose, c.dose_unit),
            schedule: getScheduleDisplay(c),
          }))}
        />
      </div>
    </div>
  );
};
