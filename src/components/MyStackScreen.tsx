import { useNavigate } from "react-router-dom";
import { Plus, MoreVertical, Pencil, Trash2, CheckCircle, RotateCcw, Activity, TrendingUp } from "lucide-react";
import { PremiumDiamond } from "@/components/ui/icons/PremiumDiamond";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDose } from "@/utils/doseUtils";
import { calculateCycleStatus } from "@/utils/cycleUtils";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Compound {
  id: string;
  name: string;
  intended_dose: number;
  dose_unit: string;
  calculated_iu: number | null;
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
  const [isPremium, setIsPremium] = useState(() => localStorage.getItem('testPremiumMode') === 'true');
  const [weeklyDoses, setWeeklyDoses] = useState(0);
  const [adherenceRate, setAdherenceRate] = useState(0);

  useEffect(() => {
    loadCompounds();
    loadWeeklyStats();
    
    // Check premium status
    const checkPremium = () => {
      const premiumStatus = localStorage.getItem('testPremiumMode') === 'true';
      setIsPremium(premiumStatus);
    };
    
    checkPremium();
    window.addEventListener('storage', checkPremium);
    return () => window.removeEventListener('storage', checkPremium);
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

    try {
      const { error } = await supabase
        .from('compounds')
        .delete()
        .eq('id', id);

      if (error) throw error;

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
    const start = new Date(startDate);
    const now = new Date();
    const diff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(1, diff + 1); // +1 to show "day 1" on start day, matching cycle display
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
    return compound.schedule_type;
  };

  const handleEdit = (compound: Compound) => {
    // Navigate to add-compound screen with compound data as state
    navigate('/add-compound', { state: { editingCompound: compound } });
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col overflow-hidden bg-background safe-top" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
        <header className="border-b border-border px-4 py-4 bg-background sticky top-0 flex-shrink-0 z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground">My Stack</h2>
            <div className="absolute left-1/2 -translate-x-1/2">
              <h1 className="text-xl font-bold bg-gradient-to-r from-[#FF6F61] to-[#8B5CF6] bg-clip-text text-transparent">
                REGIMEN
              </h1>
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background safe-top" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border px-4 py-4 bg-background/95 backdrop-blur-sm safe-top">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground">My Stack</h2>
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
            <h1 className="text-xl font-bold bg-gradient-to-r from-[#FF6F61] to-[#8B5CF6] bg-clip-text text-transparent">
              REGIMEN
            </h1>
            {isPremium && (
              <PremiumDiamond className="h-5 w-5 text-primary" />
            )}
          </div>
        </div>
      </header>

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
      <div className="flex-1 space-y-4 px-4 pb-4">
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Active
          </h2>
          
          {activeCompounds.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-border rounded-2xl">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Plus className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No active medications</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-xs">
                Add your first compound to start tracking your regimen
              </p>
              <Button onClick={() => navigate("/add-compound")}>
                <Plus className="w-4 h-4 mr-2" />
                Add Compound
              </Button>
            </div>
          ) : (
            activeCompounds.map((compound) => (
            <div
              key={compound.id}
              className="overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/12 via-primary/8 to-primary/5 shadow-md hover:shadow-lg hover:border-primary/40 transition-all animate-slide-up"
            >
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-1 h-2 w-2 rounded-full bg-primary shadow-sm shadow-primary/50 animate-pulse" />
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-foreground">{compound.name}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatDose(compound.intended_dose, compound.dose_unit)}
                        {compound.calculated_iu && ` • ${compound.calculated_iu} IU`}
                        {' • '}{compound.time_of_day.map(t => formatTime(t)).join(', ')}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {getScheduleDisplay(compound)} • Active {getDaysActive(compound.start_date)}d
                      </p>
                      
                      {/* Cycle Status - Only show if has_cycles is true */}
                      {compound.has_cycles && (() => {
                        const cycleStatus = calculateCycleStatus(
                          compound.start_date,
                          compound.cycle_weeks_on,
                          compound.cycle_weeks_off
                        );
                        
                        if (!cycleStatus) return null;
                        
                        // For one-time cycles that have ended, don't show status
                        if (!compound.cycle_weeks_off && !cycleStatus.isInCycle) return null;
                        
                        // Format cycle pattern display
                        const cyclePattern = compound.cycle_weeks_off 
                          ? `${compound.cycle_weeks_on}w on, ${compound.cycle_weeks_off}w off`
                          : `${compound.cycle_weeks_on}w duration`;
                        
                        return (
                          <div className="mt-3 pt-3 border-t border-border/50">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className={`h-2 w-2 rounded-full ${
                                  cycleStatus.currentPhase === 'on' 
                                    ? 'bg-primary animate-pulse' 
                                    : 'bg-muted-foreground'
                                }`} />
                                <span className={`text-xs font-semibold uppercase tracking-wider ${
                                  cycleStatus.currentPhase === 'on' 
                                    ? 'text-primary' 
                                    : 'text-muted-foreground'
                                }`}>
                                  {cycleStatus.currentPhase === 'on' ? 'ON Cycle' : 'OFF Cycle'}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  • Day {cycleStatus.daysIntoPhase} of {cycleStatus.totalDaysInPhase}
                                </span>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {cyclePattern}
                              </span>
                            </div>
                            <Progress 
                              value={cycleStatus.progressPercentage} 
                              className="h-1.5"
                            />
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="rounded-lg p-2 hover:bg-muted/50 transition-colors">
                        <MoreVertical className="h-5 w-5 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(compound)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => markComplete(compound.id)}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark Inactive
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => deleteCompound(compound.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          )))}
        </div>

        {/* Inactive Compounds */}
        <div className="space-y-3 pt-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Inactive ({inactiveCompounds.length})
          </h2>
          
          {inactiveCompounds.map((compound) => (
            <div
              key={compound.id}
              className="overflow-hidden rounded-2xl border border-border bg-muted shadow-sm opacity-70 hover:opacity-85 transition-opacity"
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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="rounded-lg p-2 hover:bg-muted/50 transition-colors">
                        <MoreVertical className="h-5 w-5 text-muted-foreground/70" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(compound)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => reactivateCompound(compound.id)}>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Reactivate
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => deleteCompound(compound.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAB Button */}
      <button
        onClick={() => navigate("/add-compound")}
        className="fixed right-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_30px_rgb(0,0,0,0.5)] ring-[3px] ring-white/90 transition-all hover:scale-105 hover:shadow-[0_12px_40px_rgb(0,0,0,0.6)] active:scale-95"
        style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}
      >
        <Plus className="h-6 w-6" />
      </button>

      <BottomNavigation />
    </div>
  );
};
