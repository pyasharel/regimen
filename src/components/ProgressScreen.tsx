import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Camera as CameraIcon, Plus, Upload, TrendingUp, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { SubscriptionPaywall } from "@/components/SubscriptionPaywall";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { format, differenceInDays } from "date-fns";
import { useStreaks } from "@/hooks/useStreaks";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { cn } from "@/lib/utils";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Camera } from '@capacitor/camera';
import { CameraResultType, CameraSource } from '@capacitor/camera';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import { PhotoPreviewModal } from "@/components/PhotoPreviewModal";
import { CycleTimeline } from "@/components/CycleTimeline";

type ProgressEntry = {
  id: string;
  entry_date: string;
  category: string;
  metrics: any;
  photo_url: string | null;
  notes: string | null;
  created_at: string;
};

type TimeFrame = "1M" | "3M" | "6M" | "1Y" | "All";

type Compound = {
  id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  has_cycles: boolean;
  cycle_weeks_on: number | null;
  cycle_weeks_off: number | null;
  schedule_type: string;
  created_at: string;
};

export const ProgressScreen = () => {
  console.log('[ProgressScreen] Component rendering');
  
  const navigate = useNavigate();
  const [timeFrame, setTimeFrame] = useState<TimeFrame>("1Y");
  const [showLogModal, setShowLogModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [weight, setWeight] = useState("");
  const [weightUnit, setWeightUnit] = useState<"lbs" | "kg">("lbs");
  const [entryDate, setEntryDate] = useState<Date>(new Date());
  const [photoDate, setPhotoDate] = useState<Date>(new Date());
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const { isSubscribed } = useSubscription();
  
  console.log('[ProgressScreen] State initialized');
  const [showPaywall, setShowPaywall] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; id: string } | null>(null);
  const [editingEntry, setEditingEntry] = useState<{ id: string; weight: number; date: Date; unit: string } | null>(null);

  // Cached data fetching with React Query
  const { data: entries = [], isLoading: entriesLoading, isError: entriesError, refetch: refetchEntries } = useQuery({
    queryKey: ['progress-entries'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('progress_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('entry_date', { ascending: true }); // Oldest to newest for timeline view
      
      if (error) {
        console.error('Error fetching progress entries:', error);
        return [];
      }
      return data as ProgressEntry[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
    retry: 1,
  });

  const { data: compounds = [], isLoading: compoundsLoading, isError: compoundsError } = useQuery({
    queryKey: ['compounds-progress'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('compounds')
        .select('id, name, start_date, end_date, is_active, has_cycles, cycle_weeks_on, cycle_weeks_off, schedule_type, created_at')
        .eq('user_id', user.id)
        .order('start_date', { ascending: false });
      
      if (error) {
        console.error('Error fetching compounds:', error);
        return [];
      }
      return data as Compound[];
    },
    retry: 1,
  });

  const { data: recentDoses = [], isLoading: dosesLoading, isError: dosesError } = useQuery({
    queryKey: ['recent-doses'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('doses')
        .select(`
          *,
          compounds (name)
        `)
        .eq('user_id', user.id)
        .eq('taken', true)
        .order('taken_at', { ascending: false })
        .limit(10);
      
      if (error) {
        console.error('Error fetching doses:', error);
        return [];
      }
      return data || [];
    },
    retry: 1,
  });

  const dataLoading = entriesLoading || compoundsLoading || dosesLoading;
  const hasError = entriesError || compoundsError || dosesError;
  
  console.log('[ProgressScreen] Data status:', { dataLoading, hasError, entriesCount: entries.length });


  const handleLogWeight = async () => {
    if (!weight) {
      toast.error('Please enter your weight');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const weightValue = parseFloat(weight);
      if (isNaN(weightValue) || weightValue <= 0) {
        toast.error('Please enter a valid weight');
        return;
      }

      const weightInLbs = weightUnit === 'kg' ? weightValue * 2.20462 : weightValue;

      // Check if entry exists for this date
      const dateStr = format(entryDate, 'yyyy-MM-dd');
      const { data: existingEntry } = await supabase
        .from('progress_entries')
        .select('id, category, photo_url')
        .eq('user_id', user.id)
        .eq('entry_date', dateStr)
        .maybeSingle();

      let error;
      if (existingEntry) {
        // Update existing entry
        ({ error } = await supabase
          .from('progress_entries')
          .update({ 
            category: 'weight',
            metrics: { weight: weightInLbs } 
          })
          .eq('id', existingEntry.id));
      } else {
        // Insert new entry
        ({ error } = await supabase
          .from('progress_entries')
          .insert([{
            user_id: user.id,
            entry_date: dateStr,
            category: 'weight',
            metrics: { weight: weightInLbs }
          }]));
      }

      if (error) throw error;

      toast.success('Weight logged successfully');
      setShowLogModal(false);
      setWeight("");
      setEntryDate(new Date()); // Reset to today
      refetchEntries();
    } catch (error) {
      console.error('Error logging weight:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to log weight');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    try {
      const { error } = await supabase
        .from('progress_entries')
        .delete()
        .eq('id', entryId);

      if (error) throw error;

      toast.success('Entry deleted successfully');
      setEditingEntry(null);
      refetchEntries();
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast.error('Failed to delete entry');
    }
  };

  const handleUpdateEntry = async () => {
    if (!editingEntry) return;
    
    setLoading(true);
    try {
      const dateStr = format(editingEntry.date, 'yyyy-MM-dd');
      
      const { error } = await supabase
        .from('progress_entries')
        .update({
          entry_date: dateStr,
          metrics: { weight: editingEntry.weight, unit: editingEntry.unit }
        })
        .eq('id', editingEntry.id);

      if (error) throw error;

      toast.success('Entry updated successfully');
      setEditingEntry(null);
      refetchEntries();
    } catch (error) {
      console.error('Error updating entry:', error);
      toast.error('Failed to update entry');
    } finally {
      setLoading(false);
    }
  };

  const CustomDot = (props: any) => {
    const { cx, cy, index } = props;
    return (
      <circle
        cx={cx}
        cy={cy}
        r={5}
        fill="hsl(var(--primary))"
        stroke="none"
        cursor="pointer"
        onClick={() => handleDotClick(index)}
        style={{ cursor: 'pointer' }}
      />
    );
  };

  const CustomActiveDot = (props: any) => {
    const { cx, cy, index } = props;
    return (
      <circle
        cx={cx}
        cy={cy}
        r={7}
        fill="hsl(var(--primary))"
        stroke="hsl(var(--background))"
        strokeWidth={2}
        cursor="pointer"
        onClick={() => handleDotClick(index)}
        style={{ cursor: 'pointer' }}
      />
    );
  };

  const handleDotClick = (index: number) => {
    if (index === undefined || index < 0 || index >= weightEntries.length) return;
    
    const entry = weightEntries[index];
    if (!entry) return;
    
    const [year, month, day] = entry.entry_date.split('-').map(Number);
    const localDate = new Date(year, month - 1, day);
    
    setEditingEntry({
      id: entry.id,
      weight: entry.metrics?.weight || 0,
      date: localDate,
      unit: entry.metrics?.unit || 'lbs'
    });
  };

  const triggerHaptic = async (intensity: 'light' | 'medium' = 'medium') => {
    try {
      if (Capacitor.isNativePlatform()) {
        await Haptics.impact({ style: intensity === 'light' ? ImpactStyle.Light : ImpactStyle.Medium });
      } else if ('vibrate' in navigator) {
        navigator.vibrate(intensity === 'light' ? 30 : 50);
      }
    } catch (err) {
      console.log('Haptic failed:', err);
    }
  };

  const handleCapturePhoto = async () => {
    if (!isSubscribed) {
      setShowPaywall(true);
      return;
    }

    triggerHaptic('light');

    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera
      });

      if (image.dataUrl) {
        await uploadPhotoFromDataUrl(image.dataUrl);
      }
    } catch (error) {
      console.error('Error capturing photo:', error);
      toast.error('Failed to capture photo');
    }
  };

  const handleSelectPhoto = async () => {
    if (!isSubscribed) {
      setShowPaywall(true);
      return;
    }

    triggerHaptic('light');

    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos
      });

      if (image.dataUrl) {
        await uploadPhotoFromDataUrl(image.dataUrl);
      }
    } catch (error) {
      console.error('Error selecting photo:', error);
      toast.error('Failed to select photo');
    }
  };

  const uploadPhotoFromDataUrl = async (dataUrl: string) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Convert data URL to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      
      const fileName = `${user.id}/${Date.now()}-image.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('progress-photos')
        .upload(fileName, blob, {
          contentType: 'image/jpeg'
        });

      if (uploadError) throw uploadError;

      // Check if entry exists for this date
      const dateStr = format(photoDate, 'yyyy-MM-dd');
      const { data: existingEntry } = await supabase
        .from('progress_entries')
        .select('id, category, metrics')
        .eq('user_id', user.id)
        .eq('entry_date', dateStr)
        .maybeSingle();

      let entryError;
      if (existingEntry) {
        // Update existing entry with photo
        ({ error: entryError } = await supabase
          .from('progress_entries')
          .update({ 
            category: 'photo',
            photo_url: fileName 
          })
          .eq('id', existingEntry.id));
      } else {
        // Insert new entry
        ({ error: entryError } = await supabase
          .from('progress_entries')
          .insert([{
            user_id: user.id,
            entry_date: dateStr,
            category: 'photo',
            photo_url: fileName
          }]));
      }

      if (entryError) throw entryError;

      triggerHaptic('medium'); // Success haptic
      toast.success('Photo uploaded successfully');
      setShowPhotoModal(false);
      refetchEntries();
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload photo');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredEntries = () => {
    if (timeFrame === "All") return entries;

    const now = new Date();
    const cutoffDate = new Date(now);
    
    switch (timeFrame) {
      case "1M":
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
      case "3M":
        cutoffDate.setMonth(now.getMonth() - 3);
        break;
      case "6M":
        cutoffDate.setMonth(now.getMonth() - 6);
        break;
      case "1Y":
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
    }
    
    return entries.filter(e => new Date(e.entry_date) >= cutoffDate);
  };

  const weightEntries = getFilteredEntries().filter(e => e.metrics?.weight);
  const photoEntries = entries.filter(e => e.photo_url).slice(0, 10);
  
  // Get all weight entries sorted by date (most recent first)
  const allWeightEntries = entries
    .filter(e => e.metrics?.weight)
    .sort((a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime());
  
  const currentWeight = allWeightEntries[0]?.metrics?.weight;
  const startingWeight = allWeightEntries[allWeightEntries.length - 1]?.metrics?.weight;
  const previousWeight = allWeightEntries[1]?.metrics?.weight;
  
  // Get streak data
  const { data: streakData } = useStreaks();

  // Calculate weight trend for encouraging message
  const getWeightTrend = () => {
    if (!currentWeight || !previousWeight) return 'getting_started';
    const change = previousWeight - currentWeight;
    if (change > 2) return 'weight_down'; // Lost weight
    if (change < -2) return 'weight_up'; // Gained weight
    return 'consistent'; // Maintaining
  };

  const chartData = weightEntries
    .map(entry => {
      // Parse as local date to avoid timezone shifts
      const [year, month, day] = entry.entry_date.split('-').map(Number);
      const localDate = new Date(year, month - 1, day);
      
      return {
        date: format(localDate, 'MMM d'),
        weight: Math.round(entry.metrics.weight * 10) / 10,
        fullDate: entry.entry_date
      };
    })
    .sort((a, b) => a.fullDate.localeCompare(b.fullDate)); // Sort chronologically

  const getPhotoUrl = (photoPath: string) => {
    const { data } = supabase.storage
      .from('progress-photos')
      .getPublicUrl(photoPath);
    return data.publicUrl;
  };

  const handleDeletePhoto = async (entryId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const entry = entries.find(e => e.id === entryId);
      if (!entry) return;

      // Delete from storage if has photo
      if (entry.photo_url) {
        const { error: storageError } = await supabase.storage
          .from('progress-photos')
          .remove([entry.photo_url]);
        
        if (storageError) console.error('Error deleting from storage:', storageError);
      }

      // Delete entry
      const { error } = await supabase
        .from('progress_entries')
        .delete()
        .eq('id', entryId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Photo deleted');
      refetchEntries();
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast.error('Failed to delete photo');
    }
  };
  
  console.log('[ProgressScreen] About to render, dataLoading:', dataLoading);
  
  // Show loading state
  if (dataLoading) {
    return (
      <div className="h-screen flex flex-col overflow-hidden bg-background safe-top" style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' }}>
        <header className="border-b border-border px-4 py-4 bg-background sticky top-0 flex-shrink-0 z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground">Progress</h2>
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
              <h1 className="text-xl font-bold bg-gradient-to-r from-[#FF6F61] to-[#8B5CF6] bg-clip-text text-transparent">
                REGIMEN
              </h1>
            </div>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Skeleton className="w-12 h-12 rounded-full mx-auto" />
            <p className="text-sm text-muted-foreground">Loading your progress...</p>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }
  
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background safe-top" style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' }}>
      {/* Header */}
      <header className="border-b border-border px-4 py-4 bg-background sticky top-0 flex-shrink-0 z-10">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground">Progress</h2>
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
            <h1 className="text-xl font-bold bg-gradient-to-r from-[#FF6F61] to-[#8B5CF6] bg-clip-text text-transparent">
              REGIMEN
            </h1>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Error Message */}
        {hasError && (
          <Card className="p-4 bg-destructive/10 border-destructive/20">
            <p className="text-sm text-destructive">
              There was an error loading your progress data. Please try refreshing the page.
            </p>
          </Card>
        )}
        {/* Stats Dashboard - 4 Compact Cards Grid */}
        {currentWeight && (
          <div className="grid grid-cols-2 gap-2">
            {/* Current Weight Card */}
            <Card className="p-3 bg-card border border-border">
              <div className="space-y-1">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Current Weight</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold text-foreground">{Math.round(currentWeight)}</span>
                  <span className="text-[10px] text-muted-foreground">lbs</span>
                </div>
                <div className="text-[9px] text-muted-foreground">
                  {allWeightEntries[0] && format(new Date(allWeightEntries[0].entry_date), 'MMM d')}
                </div>
              </div>
            </Card>

            {/* Total Change Card */}
            {startingWeight && startingWeight !== currentWeight && (
              <Card className="p-3 bg-card border border-border">
                <div className="space-y-1">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Change</div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-bold text-foreground">
                      {startingWeight > currentWeight ? '-' : '+'}{Math.abs(Math.round((currentWeight - startingWeight) * 10) / 10)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">lbs</span>
                  </div>
                  <div className="text-[9px] text-muted-foreground">
                    Since {allWeightEntries[allWeightEntries.length - 1] && format(new Date(allWeightEntries[allWeightEntries.length - 1].entry_date), 'MMM d')}
                  </div>
                </div>
              </Card>
            )}

            {/* Weekly Trend Card */}
            {allWeightEntries.length >= 2 && (() => {
              const recentEntries = allWeightEntries.slice(0, Math.min(4, allWeightEntries.length));
              const daysBetween = Math.max(1, differenceInDays(
                new Date(recentEntries[0].entry_date),
                new Date(recentEntries[recentEntries.length - 1].entry_date)
              ));
              const weightChange = recentEntries[0].metrics.weight - recentEntries[recentEntries.length - 1].metrics.weight;
              const weeklyAvg = (weightChange / daysBetween) * 7;
              
              return (
                <Card className="p-3 bg-card border border-border">
                  <div className="space-y-1">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Weekly Trend</div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-bold text-foreground">
                        {weeklyAvg < 0 ? '' : '+'}{Math.round(weeklyAvg * 10) / 10}
                      </span>
                      <span className="text-[10px] text-muted-foreground">lbs/wk</span>
                    </div>
                    <div className="text-[9px] text-muted-foreground">
                      Last {recentEntries.length} entries
                    </div>
                  </div>
                </Card>
              );
            })()}

            {/* Current Streak Card */}
            <Card className="p-3 bg-card border border-border">
              <div className="space-y-1">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Current Streak</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold text-foreground">{streakData?.current_streak || 0}</span>
                  <span className="text-[10px] text-muted-foreground">days</span>
                </div>
                <div className="text-[9px] text-muted-foreground">
                  Best: {streakData?.longest_streak || 0} days
                </div>
              </div>
            </Card>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-foreground">Weight Chart</h2>
            <Button 
              onClick={() => setShowLogModal(true)} 
              size="sm" 
              variant="ghost"
              className="text-primary hover:text-primary hover:bg-primary/10"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Log Weight
            </Button>
          </div>

          <div className="flex gap-1 bg-secondary p-1 rounded-lg w-fit">
            {(["1M", "3M", "6M", "1Y", "All"] as TimeFrame[]).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeFrame(tf)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  timeFrame === tf
                    ? 'bg-background text-primary shadow-sm'
                    : 'text-foreground/70 hover:text-foreground'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          <Card className="p-4 bg-muted/30">
            {dataLoading ? (
              <Skeleton className="w-full h-[200px]" />
            ) : weightEntries.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    domain={['dataMin - 5', 'dataMax + 5']}
                    label={{ 
                      value: 'Weight (lbs)', 
                      angle: -90, 
                      position: 'insideLeft',
                      style: { fill: 'hsl(var(--muted-foreground))', fontSize: 12 }
                    }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                      fontSize: '12px'
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="weight" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    dot={<CustomDot />}
                    activeDot={<CustomActiveDot />}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                No weight data yet. Start logging to see your progress!
              </div>
            )}
          </Card>
        </div>

        <Card className="p-4 bg-card border border-border space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-foreground">Visual Progress</h2>
            <Button 
              onClick={() => isSubscribed ? setShowPhotoModal(true) : setShowPaywall(true)} 
              size="sm" 
              variant="ghost"
              className="text-primary hover:text-primary hover:bg-primary/10"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add Photo
            </Button>
          </div>

          {dataLoading ? (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="flex-shrink-0 w-24 h-32 rounded-lg" />
              ))}
            </div>
          ) : photoEntries.length > 0 ? (
            <>
              <div className="flex gap-3 overflow-x-auto pb-2 scroll-smooth" style={{ scrollBehavior: 'smooth' }}>
                {photoEntries.map((entry) => {
                  // Parse as local date to avoid timezone shifts
                  const [year, month, day] = entry.entry_date.split('-').map(Number);
                  const localDate = new Date(year, month - 1, day);
                  
                  return (
                    <div key={entry.id} className="flex-shrink-0 text-center">
                      <div 
                        className="w-24 h-32 rounded-lg overflow-hidden bg-muted cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setPreviewPhoto({ url: getPhotoUrl(entry.photo_url!), id: entry.id })}
                      >
                        <img
                          src={getPhotoUrl(entry.photo_url!)}
                          alt={`Progress ${entry.entry_date}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        {format(localDate, 'MMM d')}
                      </div>
                    </div>
                  );
                })}
              </div>

              {photoEntries.length > 0 && (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => navigate("/progress/compare")}
                >
                  View All & Compare
                </Button>
              )}
            </>
          ) : photoEntries.length === 0 ? (
            <>
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No photos yet</p>
                <p className="text-xs mt-1">Start tracking your transformation</p>
              </div>
            </>
          ) : null}
        </Card>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Medication Timeline</h2>
          
          <Card className="p-6 bg-card border border-border">
            {dataLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : compounds.length > 0 ? (
              <div className="space-y-6 max-h-96 overflow-y-auto">
                {(() => {
                  // Calculate timeline range: limit to last 18 months for cleaner view
                  const now = new Date();
                  const eighteenMonthsAgo = new Date(now);
                  eighteenMonthsAgo.setMonth(now.getMonth() - 18);
                  
                  const earliestStart = compounds.reduce((earliest, compound) => {
                    const startDate = new Date(compound.start_date);
                    return startDate < earliest ? startDate : earliest;
                  }, now);
                  
                  // Use 18 months ago or earliest start, whichever is more recent
                  const timelineStart = earliestStart > eighteenMonthsAgo ? earliestStart : eighteenMonthsAgo;
                  timelineStart.setDate(1); // Start of that month
                  const timelineEnd = now;
                  const totalDays = Math.floor((timelineEnd.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24));
                  
                  // Use primary color scheme with opacity variations for clean look
                  const MEDICATION_COLORS = [
                    'hsl(var(--primary))',
                    'hsl(var(--primary) / 0.8)',
                    'hsl(var(--primary) / 0.6)',
                    'hsl(var(--primary) / 0.5)',
                    'hsl(var(--primary) / 0.4)',
                    'hsl(var(--primary) / 0.3)',
                  ];
                  
                  return (
                    <>
                      <div className="space-y-4">
                        {compounds.map((compound, idx) => {
                          const color = MEDICATION_COLORS[idx % MEDICATION_COLORS.length];
                          // Parse dates properly to avoid timezone issues
                          const [startYear, startMonth, startDay] = compound.start_date.split('-').map(Number);
                          const startDate = new Date(startYear, startMonth - 1, startDay);
                          
                          let endDate = now;
                          if (compound.end_date) {
                            const [endYear, endMonth, endDay] = compound.end_date.split('-').map(Number);
                            endDate = new Date(endYear, endMonth - 1, endDay);
                          }
                          
                          const isActive = compound.is_active && (!compound.end_date || endDate >= now);
                          
                          // Convert weeks to days using calendar month approximation (30 days per 4 weeks)
                          const convertWeeksToDays = (weeks: number) => {
                            if (weeks >= 4 && weeks % 4 === 0) {
                              return (weeks / 4) * 30; // Treat as months
                            }
                            return weeks * 7;
                          };
                          
                          // Calculate all on/off periods if has cycles
                          const periods: Array<{ start: Date; end: Date; isOn: boolean }> = [];
                          
                          if (compound.has_cycles && compound.cycle_weeks_on && compound.cycle_weeks_off) {
                            const cycleWeeksOn = compound.cycle_weeks_on;
                            const cycleWeeksOff = compound.cycle_weeks_off;
                            const daysOn = convertWeeksToDays(cycleWeeksOn);
                            const daysOff = convertWeeksToDays(cycleWeeksOff);
                            
                            let currentStart = startDate;
                            const finalEnd = endDate;
                            
                            while (currentStart < finalEnd) {
                              // On period
                              const onEnd = new Date(currentStart);
                              onEnd.setDate(onEnd.getDate() + daysOn);
                              
                              periods.push({
                                start: currentStart,
                                end: onEnd > finalEnd ? finalEnd : onEnd,
                                isOn: true
                              });
                              
                              // Off period
                              const offStart = new Date(onEnd);
                              const offEnd = new Date(offStart);
                              offEnd.setDate(offEnd.getDate() + daysOff);
                              
                              if (offStart < finalEnd) {
                                periods.push({
                                  start: offStart,
                                  end: offEnd > finalEnd ? finalEnd : offEnd,
                                  isOn: false
                                });
                              }
                              
                              currentStart = offEnd;
                              if (currentStart >= finalEnd) break;
                            }
                          } else {
                            // No cycles - just one continuous period
                            periods.push({
                              start: startDate,
                              end: endDate,
                              isOn: true
                            });
                          }
                          
                          return (
                            <div key={compound.id} className="space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <div 
                                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: color }}
                                  />
                                  <span className={`text-sm font-medium truncate ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                                    {compound.name}
                                  </span>
                                  {isActive && (
                                    <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-medium whitespace-nowrap flex-shrink-0">
                                      Active
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-muted-foreground whitespace-nowrap flex-shrink-0">
                                  {format(startDate, 'MMM d')} - {isActive ? 'Now' : format(endDate, 'MMM d')}
                                </span>
                              </div>
                              
                              {/* Thin line timeline */}
                              <div className="relative h-1 bg-muted rounded-full overflow-hidden">
                                {periods.map((period, periodIdx) => {
                                  // Only render periods within the visible timeline
                                  if (period.end < timelineStart) return null;
                                  
                                  const visibleStart = period.start < timelineStart ? timelineStart : period.start;
                                  const periodStartDays = Math.floor((visibleStart.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24));
                                  const periodEndDays = Math.floor((period.end.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24));
                                  
                                  const leftPercent = Math.max(0, (periodStartDays / totalDays) * 100);
                                  const widthPercent = Math.max(0.5, ((periodEndDays - periodStartDays) / totalDays) * 100);
                                  
                                  if (!period.isOn) return null; // Only show "on" periods
                                  
                                  return (
                                    <div
                                      key={periodIdx}
                                      className="absolute h-full transition-all"
                                      style={{
                                        left: `${leftPercent}%`,
                                        width: `${widthPercent}%`,
                                        backgroundColor: color,
                                        opacity: isActive ? 1 : 0.4,
                                      }}
                                      title={`${format(period.start, 'MMM d, yyyy')} - ${format(period.end, 'MMM d, yyyy')}`}
                                    />
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Timeline labels */}
                      <div className="relative pt-4 border-t border-border/50 mt-2">
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          {(() => {
                            const numLabels = Math.min(6, Math.ceil(totalDays / 30));
                            const labels = [];
                            
                            for (let i = 0; i < numLabels; i++) {
                              const date = new Date(timelineStart);
                              date.setDate(date.getDate() + (i * Math.floor(totalDays / (numLabels - 1))));
                              labels.push(format(date, 'MMM yy'));
                            }
                            
                            return labels.map((label, idx) => (
                              <span key={idx}>{label}</span>
                            ));
                          })()}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No medications tracked yet</p>
                <p className="text-sm mt-1">Add your first compound to see your medication journey</p>
              </div>
            )}
          </Card>
        </div>

      </div>

      <BottomNavigation />

      <Dialog open={showLogModal} onOpenChange={setShowLogModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Weight</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.1"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="Enter weight"
                  className="flex-1 h-14 text-lg"
                />
                <Select value={weightUnit} onValueChange={(value: "lbs" | "kg") => setWeightUnit(value)}>
                  <SelectTrigger className="w-24 h-14">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lbs">lbs</SelectItem>
                    <SelectItem value="kg">kg</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

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
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Button 
              onClick={handleLogWeight} 
              disabled={loading || !weight} 
              className="w-full h-14 text-base"
            >
              {loading ? 'Logging...' : 'Log Weight Entry'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPhotoModal} onOpenChange={setShowPhotoModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Progress Photo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                Photo Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-12 justify-between text-left font-normal",
                      !photoDate && "text-muted-foreground"
                    )}
                  >
                    <span className="text-muted-foreground">Photo Date</span>
                    <span>{format(photoDate, "MMM d, yyyy")}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={photoDate}
                    onSelect={(date) => date && setPhotoDate(date)}
                    disabled={(date) => date > new Date()}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Button 
              onClick={handleCapturePhoto} 
              disabled={loading} 
              className="w-full h-14 text-base"
              variant="default"
            >
              <CameraIcon className="w-5 h-5 mr-2" />
              {loading ? 'Processing...' : 'Snap a Photo'}
            </Button>
            <Button 
              onClick={handleSelectPhoto} 
              disabled={loading} 
              className="w-full h-14 text-base"
              variant="outline"
            >
              <Upload className="w-5 h-5 mr-2" />
              {loading ? 'Processing...' : 'Upload from Gallery'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <SubscriptionPaywall open={showPaywall} onOpenChange={setShowPaywall} />
      <PhotoPreviewModal
        open={!!previewPhoto}
        onClose={() => setPreviewPhoto(null)}
        photoUrl={previewPhoto?.url || ''}
        entryId={previewPhoto?.id || ''}
        onDelete={handleDeletePhoto}
        onDateUpdate={refetchEntries}
      />

      {/* Edit Weight Entry Dialog */}
      <Dialog open={!!editingEntry} onOpenChange={(open) => !open && setEditingEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Weight Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-between text-left font-normal",
                      !editingEntry?.date && "text-muted-foreground"
                    )}
                  >
                    <span className="text-muted-foreground">Entry Date</span>
                    <span>{editingEntry?.date && format(editingEntry.date, "MMM d, yyyy")}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={editingEntry?.date}
                    onSelect={(date) => date && setEditingEntry(prev => prev ? {...prev, date} : null)}
                    disabled={(date) => date > new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Weight</Label>
              <Input
                type="number"
                step="0.1"
                value={editingEntry?.weight || ''}
                onChange={(e) => setEditingEntry(prev => 
                  prev ? {...prev, weight: parseFloat(e.target.value) || 0} : null
                )}
                placeholder="Enter weight"
              />
            </div>

            <div className="space-y-2">
              <Label>Unit</Label>
              <Select
                value={editingEntry?.unit}
                onValueChange={(value: "lbs" | "kg") => 
                  setEditingEntry(prev => prev ? {...prev, unit: value} : null)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lbs">lbs</SelectItem>
                  <SelectItem value="kg">kg</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="destructive"
                onClick={() => editingEntry && handleDeleteEntry(editingEntry.id)}
                className="flex-1"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
              <Button
                onClick={handleUpdateEntry}
                disabled={loading || !editingEntry?.weight}
                className="flex-1"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
