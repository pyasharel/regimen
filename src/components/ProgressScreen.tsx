import { ProgressScreenSkeleton } from "@/components/skeletons/ProgressScreenSkeleton";
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Camera as CameraIcon, Plus, Upload, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { withQueryTimeout, TimeoutError } from "@/utils/withTimeout";
import { getUserIdWithFallback } from "@/utils/safeAuth";
import { getBatchSignedUrls } from "@/utils/storageUtils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SubscriptionPaywall } from "@/components/SubscriptionPaywall";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from "date-fns";
import { safeParseDate, safeFormatDate, createLocalDate } from "@/utils/dateUtils";
import { useStreaks } from "@/hooks/useStreaks";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { cn } from "@/lib/utils";
import { Camera } from '@capacitor/camera';
import { CameraResultType, CameraSource } from '@capacitor/camera';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import { PhotoPreviewModal } from "@/components/PhotoPreviewModal";
import { MainHeader } from "@/components/MainHeader";
import { ProgressStats } from "@/components/progress/ProgressStats";
import { MetricChart } from "@/components/progress/MetricChart";
import { MetricLogModal } from "@/components/progress/MetricLogModal";
import { BodySettingsModal } from "@/components/progress/BodySettingsModal";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { persistentStorage } from "@/utils/persistentStorage";
import { trackPhotoUploaded, trackPaywallShown, trackCorrelationUsed, trackMetricLogged } from "@/utils/analytics";

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
type MetricType = "weight" | "energy" | "sleep" | "cravings";

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

type DosageChange = {
  date: Date;
  amount: number;
  unit: string;
};

export const ProgressScreen = () => {
  const navigate = useNavigate();
  const [timeFrame, setTimeFrame] = useState<TimeFrame>("1Y");
  const [metricType, setMetricType] = useState<MetricType>("weight");
  const [selectedCompoundId, setSelectedCompoundId] = useState<string>("");
  const [showLogModal, setShowLogModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoDate, setPhotoDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);
  
  const { isSubscribed } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; id: string } | null>(null);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [timelineExpanded, setTimelineExpanded] = useState(false);
  const [visualProgressExpanded, setVisualProgressExpanded] = useState(true);
  const [showGoalModal, setShowGoalModal] = useState(false);
  
  // User settings for weight unit and goal
  const [weightUnit, setWeightUnit] = useState<string>('lbs');
  const [goalWeight, setGoalWeight] = useState<number | undefined>();
  
  // Load user settings from persistent storage with database fallback
  useEffect(() => {
    const loadSettings = async () => {
      const savedUnit = await persistentStorage.get('weightUnit');
      const savedGoal = await persistentStorage.get('goalWeight');
      const savedVisualProgress = await persistentStorage.get('visualProgressExpanded');
      if (savedVisualProgress !== null) {
        setVisualProgressExpanded(savedVisualProgress !== 'false');
      }
      
      // If local storage has both values, use them
      if (savedUnit && savedGoal) {
        setWeightUnit(savedUnit);
        const goalValue = parseFloat(savedGoal);
        const goalInLbs = savedUnit === 'kg' ? goalValue * 2.20462 : goalValue;
        setGoalWeight(goalInLbs);
        return;
      }
      
      // Fallback: sync from database (for values set during onboarding)
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('goal_weight, current_weight_unit, current_weight')
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (profile) {
            // Sync unit from database if not in local storage
            if (!savedUnit && profile.current_weight_unit) {
              const unit = profile.current_weight_unit === 'kg' ? 'kg' : 'lbs';
              setWeightUnit(unit);
              await persistentStorage.set('weightUnit', unit);
              console.log('[ProgressScreen] Synced weight unit from database:', unit);
            }
            
            // Sync goal weight from database if not in local storage
            if (!savedGoal && profile.goal_weight) {
              const dbUnit = profile.current_weight_unit || 'lbs';
              const goalInLbs = dbUnit === 'kg' 
                ? profile.goal_weight * 2.20462 
                : profile.goal_weight;
              setGoalWeight(goalInLbs);
              await persistentStorage.set('goalWeight', profile.goal_weight.toString());
              console.log('[ProgressScreen] Synced goal weight from database:', profile.goal_weight, dbUnit);
            }
          }
        }
      } catch (err) {
        console.error('[ProgressScreen] Error syncing settings from database:', err);
      }
      
      // Apply any local values that existed
      if (savedUnit) setWeightUnit(savedUnit);
      if (savedGoal) {
        const goalValue = parseFloat(savedGoal);
        const goalInLbs = savedUnit === 'kg' ? goalValue * 2.20462 : goalValue;
        setGoalWeight(goalInLbs);
      }
    };
    loadSettings();
  }, []);

  // Re-load settings when returning from settings page
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        const savedUnit = await persistentStorage.get('weightUnit');
        const savedGoal = await persistentStorage.get('goalWeight');
        if (savedUnit) setWeightUnit(savedUnit);
        if (savedGoal) {
          const goalValue = parseFloat(savedGoal);
          const goalInLbs = savedUnit === 'kg' ? goalValue * 2.20462 : goalValue;
          setGoalWeight(goalInLbs);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const handleSaveGoal = async (value: number) => {
    // value comes in as lbs (internal format), convert to user's unit for storage
    const displayValue = weightUnit === 'kg' ? Math.round(value / 2.20462) : Math.round(value);
    await persistentStorage.set('goalWeight', displayValue.toString());
    setGoalWeight(value);
    toast.success('Goal weight saved');
  };

  // Fetch progress entries
  const { data: entries = [], isLoading: entriesLoading, refetch: refetchEntries } = useQuery({
    queryKey: ['progress-entries'],
    queryFn: async () => {
      const userId = await getUserIdWithFallback(3000);
      if (!userId) return [];
      
      try {
        const { data, error } = await withQueryTimeout(
          supabase
            .from('progress_entries')
            .select('*')
            .eq('user_id', userId)
            .order('entry_date', { ascending: true }),
          'progress-entries',
          8000
        );
        
        if (error) {
          console.error('Error fetching progress entries:', error);
          return [];
        }
        return data as ProgressEntry[];
      } catch (error) {
        if (error instanceof TimeoutError) {
          console.warn('[ProgressScreen] progress-entries query timed out');
          toast.error("Slow connection - tap to retry");
        }
        return [];
      }
    },
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  // Fetch compounds
  const { data: compounds = [], isLoading: compoundsLoading } = useQuery({
    queryKey: ['compounds-progress'],
    queryFn: async () => {
      const userId = await getUserIdWithFallback(3000);
      if (!userId) return [];
      
      try {
        const { data, error } = await withQueryTimeout(
          supabase
            .from('compounds')
            .select('id, name, start_date, end_date, is_active, has_cycles, cycle_weeks_on, cycle_weeks_off, schedule_type, created_at')
            .eq('user_id', userId)
            .order('start_date', { ascending: false }),
          'compounds-progress',
          8000
        );
        
        if (error) {
          console.error('Error fetching compounds:', error);
          return [];
        }
        return data as Compound[];
      } catch (error) {
        if (error instanceof TimeoutError) {
          console.warn('[ProgressScreen] compounds-progress query timed out');
        }
        return [];
      }
    },
    retry: 1,
  });

  // Fetch doses for medication correlation
  const { data: doses = [], isLoading: dosesLoading } = useQuery({
    queryKey: ['doses-progress'],
    queryFn: async () => {
      const userId = await getUserIdWithFallback(3000);
      if (!userId) return [];
      
      try {
        const { data, error } = await withQueryTimeout(
          supabase
            .from('doses')
            .select('*')
            .eq('user_id', userId)
            .eq('taken', true)
            .order('scheduled_date', { ascending: true }),
          'doses-progress',
          8000
        );
        
        if (error) return [];
        return data || [];
      } catch (error) {
        if (error instanceof TimeoutError) {
          console.warn('[ProgressScreen] doses-progress query timed out');
        }
        return [];
      }
    },
    retry: 1,
  });

  const dataLoading = entriesLoading || compoundsLoading || dosesLoading;
  
  // Preload signed URLs for photos using batch API for better performance
  useEffect(() => {
    const loadPhotoUrls = async () => {
      const photoEntries = entries.filter(e => e.photo_url);
      if (photoEntries.length === 0) return;
      
      const paths = photoEntries.map(e => e.photo_url!);
      console.log('[ProgressScreen] Loading batch signed URLs for', paths.length, 'photos');
      const urlMap = await getBatchSignedUrls('progress-photos', paths);
      
      const urls: Record<string, string> = {};
      urlMap.forEach((signedUrl, path) => {
        urls[path] = signedUrl;
      });
      setPhotoUrls(urls);
      console.log('[ProgressScreen] Loaded', Object.keys(urls).length, 'photo URLs');
    };
    if (entries.length > 0) loadPhotoUrls();
  }, [entries]);

  // Calculate dosage changes for selected compound
  const dosageChanges = useMemo((): DosageChange[] => {
    if (!selectedCompoundId) return [];
    
    const compoundDoses = doses
      .filter(d => d.compound_id === selectedCompoundId)
      .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));

    if (compoundDoses.length === 0) return [];

    const changes: DosageChange[] = [];
    let lastDoseAmount = -1;
    let lastDoseUnit = "";

    compoundDoses.forEach(dose => {
      if (dose.dose_amount !== lastDoseAmount || dose.dose_unit !== lastDoseUnit) {
        changes.push({
          date: parseISO(dose.scheduled_date),
          amount: dose.dose_amount,
          unit: dose.dose_unit,
        });
        lastDoseAmount = dose.dose_amount;
        lastDoseUnit = dose.dose_unit;
      }
    });

    return changes;
  }, [selectedCompoundId, doses]);

  // Calculate rate per current dosage level
  const ratePerDosage = useMemo(() => {
    if (!selectedCompoundId || dosageChanges.length === 0) return null;
    
    const weightEntries = entries.filter(e => e.metrics?.weight);
    if (weightEntries.length < 2) return null;

    // Find current dosage (most recent change)
    const currentDosage = dosageChanges[dosageChanges.length - 1];
    
    // Find weight entries during this dosage period
    const entriesDuringDosage = weightEntries.filter(e => {
      const entryDate = parseISO(e.entry_date);
      return entryDate >= currentDosage.date;
    }).sort((a, b) => a.entry_date.localeCompare(b.entry_date));

    if (entriesDuringDosage.length < 2) return null;

    const firstEntry = entriesDuringDosage[0];
    const lastEntry = entriesDuringDosage[entriesDuringDosage.length - 1];
    const daysBetween = Math.max(1, Math.floor((parseISO(lastEntry.entry_date).getTime() - parseISO(firstEntry.entry_date).getTime()) / (1000 * 60 * 60 * 24)));
    const weightChange = lastEntry.metrics.weight - firstEntry.metrics.weight;
    const weeklyRate = (weightChange / daysBetween) * 7;

    return {
      rate: weeklyRate,
      dosage: currentDosage,
      entries: entriesDuringDosage.length
    };
  }, [selectedCompoundId, dosageChanges, entries]);

  const { data: streakData } = useStreaks();

  const weightEntries = entries.filter(e => e.metrics?.weight);
  const photoEntries = entries.filter(e => e.photo_url).slice(0, 10);

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
      trackPaywallShown('photo_capture');
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
    }
  };

  const handleSelectPhoto = async () => {
    if (!isSubscribed) {
      trackPaywallShown('photo_select');
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
    }
  };

  const uploadPhotoFromDataUrl = async (dataUrl: string) => {
    setLoading(true);
    console.log('[PhotoUpload] Starting upload...');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('[PhotoUpload] No authenticated user');
        toast.error('Please sign in to upload photos');
        return;
      }
      console.log('[PhotoUpload] User authenticated:', user.id);

      const response = await fetch(dataUrl);
      const blob = await response.blob();
      console.log('[PhotoUpload] Blob created, size:', blob.size, 'type:', blob.type);
      
      const fileName = `${user.id}/${Date.now()}-image.jpg`;
      console.log('[PhotoUpload] Uploading to:', fileName);
      
      const { error: uploadError } = await supabase.storage
        .from('progress-photos')
        .upload(fileName, blob, { contentType: 'image/jpeg' });

      if (uploadError) {
        console.error('[PhotoUpload] Storage upload failed:', uploadError);
        toast.error(`Upload failed: ${uploadError.message}`);
        return;
      }
      console.log('[PhotoUpload] Storage upload successful');

      const dateStr = format(photoDate, 'yyyy-MM-dd');
      console.log('[PhotoUpload] Creating entry for date:', dateStr);
      
      const { data: existingEntry } = await supabase
        .from('progress_entries')
        .select('id')
        .eq('user_id', user.id)
        .eq('entry_date', dateStr)
        .eq('category', 'photo')
        .maybeSingle();

      let entryError;
      if (existingEntry) {
        console.log('[PhotoUpload] Updating existing entry:', existingEntry.id);
        ({ error: entryError } = await supabase
          .from('progress_entries')
          .update({ photo_url: fileName })
          .eq('id', existingEntry.id));
      } else {
        console.log('[PhotoUpload] Creating new entry');
        ({ error: entryError } = await supabase
          .from('progress_entries')
          .insert([{
            user_id: user.id,
            entry_date: dateStr,
            category: 'photo',
            photo_url: fileName
          }]));
      }

      if (entryError) {
        console.error('[PhotoUpload] Database entry failed:', entryError);
        toast.error(`Failed to save photo: ${entryError.message}`);
        return;
      }
      console.log('[PhotoUpload] Entry saved successfully');

      triggerHaptic('medium');
      trackPhotoUploaded('progress');
      toast.success('Photo uploaded successfully');
      setShowPhotoModal(false);
      refetchEntries();
    } catch (error: any) {
      console.error('[PhotoUpload] Exception:', error);
      toast.error(`Failed to upload: ${error?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePhoto = async (entryId: string) => {
    triggerHaptic('medium');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const entry = entries.find(e => e.id === entryId);
      if (!entry) return;

      if (entry.photo_url) {
        await supabase.storage.from('progress-photos').remove([entry.photo_url]);
      }

      const { error } = await supabase
        .from('progress_entries')
        .delete()
        .eq('id', entryId)
        .eq('user_id', user.id);

      if (error) throw error;
      toast.success('Photo deleted');
      setPreviewPhoto(null);
      refetchEntries();
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast.error('Failed to delete photo');
    }
  };

  const getMetricLabel = (type: MetricType) => {
    switch (type) {
      case "weight": return "Weight";
      case "energy": return "Energy";
      case "sleep": return "Sleep";
      case "cravings": return "Cravings";
    }
  };

  const selectedCompound = compounds.find(c => c.id === selectedCompoundId);
  
  if (dataLoading) {
    return <ProgressScreenSkeleton />;
  }
  
  return (
    <div className="fixed inset-0 bg-background flex flex-col app-top-padding">
      <div className="flex-1 min-h-0 scroll-container pb-24">
        <MainHeader title="Progress" />

        <div className="p-4 space-y-6 max-w-2xl mx-auto w-full">
        {/* Stats Dashboard */}
        <ProgressStats 
          weightEntries={weightEntries}
          streakData={streakData}
          goalWeight={goalWeight}
          weightUnit={weightUnit}
          onSetGoal={() => setShowGoalModal(true)}
        />

        {/* Metric Type Selector - More muted styling */}
        <div className="flex gap-2 border-b border-border/50">
        {(["weight", "energy", "sleep", "cravings"] as MetricType[]).map(type => (
            <button
              key={type}
              onClick={() => {
                triggerHaptic('light');
                setMetricType(type);
              }}
              className={cn(
                "pb-2 px-1 text-xs font-medium transition-all border-b-2 -mb-px",
                metricType === type
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {getMetricLabel(type)}
            </button>
          ))}
        </div>

        {/* Chart Section */}
        <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-semibold text-foreground">
                {getMetricLabel(metricType)}
              </h2>
              <Button 
                onClick={() => setShowLogModal(true)} 
                size="sm" 
                variant="ghost"
                className="text-primary hover:text-primary hover:bg-primary/10 h-8 text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Log {getMetricLabel(metricType)}
              </Button>
            </div>

            {/* Time Frame Selector - Full purple bar with lighter active */}
            <div className="flex gap-0.5 p-1 w-fit bg-secondary/80 rounded-lg">
              {(["1M", "3M", "6M", "1Y", "All"] as TimeFrame[]).map((tf) => (
                <button
                  key={tf}
                  onClick={() => {
                    triggerHaptic('light');
                    setTimeFrame(tf);
                  }}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    timeFrame === tf
                      ? 'bg-white/25 text-white shadow-sm'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>

            <Card className="p-4 bg-card shadow-[var(--shadow-card)]" onClick={() => triggerHaptic('light')}>
              <MetricChart
                metricType={metricType}
                entries={entries}
                timeFrame={timeFrame}
                isLoading={dataLoading}
                dosageChanges={selectedCompoundId ? dosageChanges : []}
                selectedMedication={selectedCompound?.name}
                weightUnit={weightUnit}
              />
            </Card>

            {/* Medication Correlation - Below chart, available for weight/energy/sleep */}
            {compounds.length > 0 && (
              <div className="space-y-2">
                <Select
                  value={selectedCompoundId || "none"}
                  onValueChange={(value) => {
                    setSelectedCompoundId(value === "none" ? "" : value);
                    if (value !== "none") {
                      const compound = compounds.find(c => c.id === value);
                      if (compound) {
                        trackCorrelationUsed(metricType, compound.name);
                      }
                    }
                  }}
                >
                  <SelectTrigger className="w-full h-9 text-xs bg-muted/50 border-border">
                    <SelectValue placeholder="Correlation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Correlation</SelectItem>
                    {compounds.map(compound => (
                      <SelectItem key={compound.id} value={compound.id}>
                        {compound.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Rate per dosage stat - only for weight */}
                {metricType === "weight" && selectedCompoundId && ratePerDosage && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground px-2">
                    <span>
                      At {ratePerDosage.dosage.amount}{ratePerDosage.dosage.unit}:
                    </span>
                    <span className="font-medium text-foreground">
                      {ratePerDosage.rate >= 0 ? '+' : ''}{(weightUnit === 'kg' ? ratePerDosage.rate / 2.20462 : ratePerDosage.rate).toFixed(1)} {weightUnit}/wk
                    </span>
                    <span className="text-muted-foreground/70">
                      ({ratePerDosage.entries} entries)
                    </span>
                  </div>
                )}
              </div>
            )}
        </div>

        {/* Visual Progress - Collapsible */}
        <Collapsible 
          open={visualProgressExpanded} 
          onOpenChange={(open) => {
            setVisualProgressExpanded(open);
            persistentStorage.set('visualProgressExpanded', String(open));
          }}
        >
          <Card className="bg-card shadow-[var(--shadow-card)] overflow-hidden">
            <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
              <h2 className="text-lg font-semibold text-foreground">Visual Progress</h2>
              <div className="flex items-center gap-2">
                {visualProgressExpanded && (
                  <Button 
                    onClick={(e) => {
                      e.stopPropagation();
                      isSubscribed ? setShowPhotoModal(true) : setShowPaywall(true);
                    }} 
                    size="sm" 
                    variant="ghost"
                    className="text-primary hover:text-primary hover:bg-primary/10"
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    Add Photo
                  </Button>
                )}
                {visualProgressExpanded ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-4 pb-4 space-y-4">
                {photoEntries.length > 0 ? (
                  <>
                    <div className="flex gap-3 overflow-x-auto pb-2 scroll-smooth">
                      {photoEntries.map((entry) => {
                        const localDate = createLocalDate(entry.entry_date);
                        if (!localDate) return null;
                        
                        return (
                          <div key={entry.id} className="flex-shrink-0 text-center">
                            <div 
                              className="w-24 h-32 rounded-lg overflow-hidden bg-muted cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => setPreviewPhoto({ url: photoUrls[entry.photo_url!] || '', id: entry.id })}
                            >
                              {photoUrls[entry.photo_url!] ? (
                                <img
                                  src={photoUrls[entry.photo_url!]}
                                  alt={`Progress ${entry.entry_date}`}
                                  className="w-full h-full object-cover animate-fade-in"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-full h-full animate-pulse bg-muted" />
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-2">
                              {safeFormatDate(localDate, 'MMM d')}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => navigate("/progress/compare")}
                    >
                      View All & Compare
                    </Button>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {['Week 1', 'Week 4', 'Week 8'].map((label, index) => (
                        <div key={index} className="flex-shrink-0 text-center">
                          <div 
                            className="w-24 h-32 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30 relative cursor-pointer group hover:from-primary/30 hover:to-primary/20 transition-all"
                            onClick={() => setShowPhotoModal(true)}
                          >
                            <div className="absolute inset-0 flex items-center justify-center">
                              <CameraIcon className="w-7 h-7 text-primary/60 group-hover:text-primary group-hover:scale-110 transition-all" />
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground/60 mt-2">
                            {label}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-center text-sm text-muted-foreground">
                      Tap to add your first progress photo
                    </p>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Collapsible Medication Timeline */}
        {compounds.length > 0 && (
          <Collapsible open={timelineExpanded} onOpenChange={setTimelineExpanded}>
            <Card className="bg-card border border-border shadow-[var(--shadow-card)] overflow-hidden">
              <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                <h2 className="text-lg font-semibold text-foreground">Medication Timeline</h2>
                {timelineExpanded ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-4 pb-4">
                  <div className="space-y-4">
                    {(() => {
                      const now = new Date();
                      const eighteenMonthsAgo = new Date(now);
                      eighteenMonthsAgo.setMonth(now.getMonth() - 18);
                      
                      const earliestStart = compounds.reduce((earliest, compound) => {
                        const startDate = safeParseDate(compound.start_date);
                        if (!startDate) return earliest;
                        return startDate < earliest ? startDate : earliest;
                      }, now);
                      
                      const timelineStart = earliestStart > eighteenMonthsAgo ? earliestStart : eighteenMonthsAgo;
                      timelineStart.setDate(1);
                      const timelineEnd = now;
                      const totalDays = Math.floor((timelineEnd.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24));
                      
                      const MEDICATION_COLORS = [
                        'hsl(var(--primary))',
                        'hsl(var(--primary))',
                        'hsl(var(--primary))',
                        'hsl(var(--primary))',
                      ];
                      
                      return (
                        <>
                          <div className="space-y-4">
                            {compounds.map((compound, idx) => {
                              const color = MEDICATION_COLORS[idx % MEDICATION_COLORS.length];
                              const startDate = safeParseDate(compound.start_date);
                              const endDate = compound.end_date ? safeParseDate(compound.end_date) : now;
                              
                              if (!startDate) return null;
                              
                              const isActive = compound.is_active && (!compound.end_date || (endDate && endDate >= now));
                              
                              // Values are stored as DAYS in the database
                              const periods: Array<{ start: Date; end: Date; isOn: boolean }> = [];
                              
                              if (compound.has_cycles && compound.cycle_weeks_on && compound.cycle_weeks_off) {
                                const daysOn = compound.cycle_weeks_on;
                                const daysOff = compound.cycle_weeks_off;
                                
                                let currentStart = startDate;
                                const finalEnd = endDate;
                                
                                while (currentStart < finalEnd) {
                                  const onEnd = new Date(currentStart);
                                  onEnd.setDate(onEnd.getDate() + daysOn);
                                  periods.push({ start: currentStart, end: onEnd > finalEnd ? finalEnd : onEnd, isOn: true });
                                  
                                  const offStart = new Date(onEnd);
                                  const offEnd = new Date(offStart);
                                  offEnd.setDate(offEnd.getDate() + daysOff);
                                  
                                  if (offStart < finalEnd) {
                                    periods.push({ start: offStart, end: offEnd > finalEnd ? finalEnd : offEnd, isOn: false });
                                  }
                                  currentStart = offEnd;
                                  if (currentStart >= finalEnd) break;
                                }
                              } else {
                                periods.push({ start: startDate, end: endDate, isOn: true });
                              }
                              
                              return (
                                <div key={compound.id} className="space-y-2">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
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
                                      {safeFormatDate(startDate, 'MMM d')} - {isActive ? 'Now' : safeFormatDate(endDate, 'MMM d')}
                                    </span>
                                  </div>
                                  
                                  <div className="relative h-1 bg-muted rounded-full overflow-hidden">
                                    {periods.map((period, periodIdx) => {
                                      if (period.end < timelineStart) return null;
                                      
                                      const visibleStart = period.start < timelineStart ? timelineStart : period.start;
                                      const periodStartDays = Math.floor((visibleStart.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24));
                                      const periodEndDays = Math.floor((period.end.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24));
                                      
                                      const leftPercent = Math.max(0, (periodStartDays / totalDays) * 100);
                                      const widthPercent = Math.max(0.5, ((periodEndDays - periodStartDays) / totalDays) * 100);
                                      
                                      if (!period.isOn) return null;
                                      
                                      return (
                                        <div
                                          key={periodIdx}
                                          className="absolute h-full"
                                          style={{
                                            left: `${leftPercent}%`,
                                            width: `${widthPercent}%`,
                                            backgroundColor: color,
                                            opacity: isActive ? 1 : 0.4,
                                          }}
                                        />
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            }).filter(Boolean)}
                          </div>
                          
                          <div className="relative pt-4 border-t border-border/50 mt-2">
                            <div className="flex justify-between text-[10px] text-muted-foreground">
                              {(() => {
                                const numLabels = Math.min(6, Math.ceil(totalDays / 30));
                                const labels = [];
                                for (let i = 0; i < numLabels; i++) {
                                  const date = new Date(timelineStart);
                                  date.setDate(date.getDate() + (i * Math.floor(totalDays / (numLabels - 1))));
                                  labels.push(safeFormatDate(date, 'MMM yy'));
                                }
                                return labels.map((label, idx) => <span key={idx}>{label}</span>);
                              })()}
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}
        </div>
      </div>
      {/* End of scroll-container */}

      <BottomNavigation />

      {/* Log Modal */}
      <MetricLogModal
        open={showLogModal}
        onOpenChange={setShowLogModal}
        metricType={metricType}
        onSuccess={refetchEntries}
      />

      {/* Photo Modal */}
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
                    className={cn("w-full h-12 justify-between text-left font-normal")}
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
      <BodySettingsModal
        open={showGoalModal}
        onOpenChange={setShowGoalModal}
        type="goal"
        currentValue={goalWeight}
        onSave={handleSaveGoal}
      />
    </div>
  );
};
