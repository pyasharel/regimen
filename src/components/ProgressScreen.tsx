import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Camera as CameraIcon, Plus, Upload, TrendingUp } from "lucide-react";
import { PremiumDiamond } from "@/components/ui/icons/PremiumDiamond";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PremiumModal } from "@/components/PremiumModal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { format, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Camera } from '@capacitor/camera';
import { CameraResultType, CameraSource } from '@capacitor/camera';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import { useHealthIntegration } from "@/hooks/useHealthIntegration";
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
  const navigate = useNavigate();
  const [timeFrame, setTimeFrame] = useState<TimeFrame>("3M");
  const [showLogModal, setShowLogModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [weight, setWeight] = useState("");
  const [weightUnit, setWeightUnit] = useState<"lbs" | "kg">("lbs");
  const [entryDate, setEntryDate] = useState<Date>(new Date());
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; id: string } | null>(null);
  
  const { isEnabled: healthSyncEnabled, syncWeightFromHealth, saveWeightToHealth, requestPermission } = useHealthIntegration();

  // Cached data fetching with React Query
  const { data: entries = [], isLoading: entriesLoading, refetch: refetchEntries } = useQuery({
    queryKey: ['progress-entries'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('progress_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('entry_date', { ascending: false });
      
      if (error) throw error;
      return data as ProgressEntry[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
  });

  const { data: compounds = [], isLoading: compoundsLoading } = useQuery({
    queryKey: ['compounds-progress'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('compounds')
        .select('id, name, start_date, end_date, is_active, has_cycles, cycle_weeks_on, cycle_weeks_off, schedule_type, created_at')
        .eq('user_id', user.id)
        .order('start_date', { ascending: false });
      
      if (error) throw error;
      return data as Compound[];
    },
  });

  const { data: recentDoses = [], isLoading: dosesLoading } = useQuery({
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
      
      if (error) throw error;
      return data || [];
    },
  });

  const dataLoading = entriesLoading || compoundsLoading || dosesLoading;

  // Premium status check
  useEffect(() => {
    const checkPremium = () => {
      const premiumStatus = localStorage.getItem('testPremiumMode') === 'true';
      setIsPremium(premiumStatus);
    };
    
    checkPremium();
    window.addEventListener('storage', checkPremium);
    return () => window.removeEventListener('storage', checkPremium);
  }, []);


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

      // Request health permissions if not already granted
      if (healthSyncEnabled) {
        await requestPermission();
      }

      const { error } = await supabase
        .from('progress_entries')
        .insert([{
          user_id: user.id,
          entry_date: format(entryDate, 'yyyy-MM-dd'),
          category: 'weight',
          metrics: { weight: weightInLbs }
        }]);

      if (error) throw error;

      // Sync to health app if enabled
      if (healthSyncEnabled) {
        await saveWeightToHealth(weightInLbs);
      }

      toast.success('Weight logged successfully');
      setShowLogModal(false);
      setWeight("");
      refetchEntries();
    } catch (error) {
      console.error('Error logging weight:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to log weight');
    } finally {
      setLoading(false);
    }
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
    if (!isPremium) {
      toast.error('Photo upload is a premium feature');
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
    if (!isPremium) {
      toast.error('Photo upload is a premium feature');
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

      const { error: entryError } = await supabase
        .from('progress_entries')
        .insert([{
          user_id: user.id,
          entry_date: new Date().toISOString().split('T')[0],
          category: 'photo',
          photo_url: fileName
        }]);

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
  const currentWeight = entries[0]?.metrics?.weight;

  const chartData = weightEntries
    .slice()
    .reverse()
    .map(entry => ({
      date: format(new Date(entry.entry_date), 'MMM d'),
      weight: Math.round(entry.metrics.weight * 10) / 10,
      fullDate: entry.entry_date
    }));

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
            {isPremium && (
              <PremiumDiamond className="h-5 w-5 text-primary" />
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-foreground">Weight Progress</h2>
            <Button onClick={() => setShowLogModal(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Log Weight
            </Button>
          </div>

          {dataLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-48" />
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-10 w-16" />
                ))}
              </div>
            </div>
          ) : currentWeight ? (
            <div className="flex items-baseline gap-6">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold text-foreground">{currentWeight}</span>
                  <span className="text-xl text-muted-foreground">lbs</span>
                </div>
                <div className="text-sm text-muted-foreground mt-1">Current</div>
              </div>
            </div>
          ) : null}

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
            ) : chartData.length > 0 ? (
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
                    dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                    activeDot={{ r: 6 }}
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

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Visual Progress</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Track your transformation with side-by-side photo comparisons
              </p>
            </div>
            <Button 
              onClick={() => isPremium ? setShowPhotoModal(true) : setShowPremiumModal(true)} 
              size="sm"
              variant={isPremium ? "default" : "outline"}
              className={!isPremium ? "gap-2" : ""}
            >
              {!isPremium && <PremiumDiamond className="w-4 h-4" />}
              <CameraIcon className="w-4 h-4 mr-2" />
              {isPremium ? "Upload Photo" : "Unlock"}
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
              <div className="flex gap-3 overflow-x-auto pb-2">
                {[...photoEntries].reverse().map((entry) => (
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
                      {format(new Date(entry.entry_date), 'MMM d')}
                    </div>
                  </div>
                ))}
              </div>

              {photoEntries.length > 0 && (
                <>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => navigate("/progress/compare")}
                  >
                    View All Photos & Compare
                  </Button>
                  <Button 
                    onClick={() => navigate('/progress/insights')}
                    variant="outline"
                    className="w-full"
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    View Timeline Insights
                  </Button>
                </>
              )}
            </>
          ) : (
            <>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="flex-shrink-0">
                  <Card className="w-24 h-32 bg-card border-2 border-dashed border-border hover:border-primary/50 transition-colors flex items-center justify-center relative group">
                      <CameraIcon className="w-8 h-8 text-muted-foreground/40 group-hover:text-primary/60 transition-colors" />
                      <div className="absolute top-2 right-2">
                        <PremiumDiamond className="w-4 h-4 text-primary/70" />
                      </div>
                    </Card>
                  </div>
                ))}
              </div>

              <div className="text-center py-3">
                <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowPremiumModal(true)}>
                  <PremiumDiamond className="w-4 h-4" />
                  Unlock Premium to Upload Photos
                </Button>
              </div>
            </>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Medication Timeline</h2>
          
          <Card className="p-6 bg-muted/30">
            {compounds.length > 0 ? (
              <div className="space-y-6">
                <div className="space-y-3">
                  {compounds.map((compound) => {
                    const startDate = new Date(compound.start_date);
                    const endDate = compound.end_date ? new Date(compound.end_date) : new Date();
                    const now = new Date();
                    
                    // Consider active if: is_active flag is true AND (no end_date OR end_date is in the future)
                    const isActive = compound.is_active && (!compound.end_date || endDate >= now);
                    
                    const sixMonthsAgo = new Date(now);
                    sixMonthsAgo.setMonth(now.getMonth() - 6);
                    
                    const timelineStart = sixMonthsAgo;
                    const timelineEnd = now;
                    const totalDays = Math.floor((timelineEnd.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24));
                    
                    const compoundStartDays = Math.max(0, Math.floor((startDate.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24)));
                    const compoundEndDays = Math.min(totalDays, Math.floor((endDate.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24)));
                    
                    const leftPercent = (compoundStartDays / totalDays) * 100;
                    const widthPercent = ((compoundEndDays - compoundStartDays) / totalDays) * 100;
                    
                    return (
                      <div key={compound.id} className="space-y-1">
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-medium text-foreground">{compound.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(startDate, 'MMM d')} - {isActive ? 'Active' : format(endDate, 'MMM d')}
                          </span>
                        </div>
                        <div className="relative h-8 bg-background/50 rounded-lg overflow-hidden">
                          <div
                            className={`absolute h-full rounded-lg transition-all ${
                              isActive 
                                ? 'bg-gradient-to-r from-primary to-primary/70' 
                                : 'bg-muted'
                            }`}
                            style={{
                              left: `${leftPercent}%`,
                              width: `${widthPercent}%`,
                              minWidth: '2%'
                            }}
                          />
                        </div>
                        <CycleTimeline compound={compound} />
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No medications tracked yet</p>
                <p className="text-sm mt-1">Add your first compound to see your medication timeline</p>
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
          <div className="space-y-3">
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

      <PremiumModal open={showPremiumModal} onOpenChange={setShowPremiumModal} />
      <PhotoPreviewModal 
        open={!!previewPhoto}
        onClose={() => setPreviewPhoto(null)}
        photoUrl={previewPhoto?.url || ''}
        entryId={previewPhoto?.id || ''}
        onDelete={handleDeletePhoto}
      />
    </div>
  );
};
