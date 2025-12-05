import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Button } from "@/components/ui/button";
import { Scale, TrendingDown, TrendingUp, Camera, CameraIcon as CameraIconLucide, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SubscriptionPaywall } from "@/components/SubscriptionPaywall";
import { toast } from "sonner";
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { PhotoPreviewModal } from "@/components/PhotoPreviewModal";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { getSignedUrl } from "@/utils/storageUtils";
import { format, subDays, parseISO, startOfDay, differenceInDays, subMonths, subYears } from "date-fns";
import { useStreaks } from "@/hooks/useStreaks";
import { Flame } from "lucide-react";
import { hapticMedium, hapticSuccess } from "@/utils/haptics";
import { 
  ComposedChart,
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
} from 'recharts';

type TimelineDataPoint = {
  date: string;
  dateObj: Date;
  weight?: number;
  [key: string]: any;
};

const MEDICATION_COLORS = [
  '#FF6F61', // coral
  '#8B5CF6', // purple  
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // orange
  '#EC4899', // pink
];

export const ProgressScreen = () => {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<'1M' | '3M' | '6M' | 'ALL'>('1M');
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; date: string; id: string } | null>(null);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const { isSubscribed } = useSubscription();
  const [showLogModal, setShowLogModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [weight, setWeight] = useState("");
  const [weightUnit, setWeightUnit] = useState<"lbs" | "kg">("lbs");
  const [entryDate, setEntryDate] = useState<Date>(new Date());
  const [photoEntryDate, setPhotoEntryDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);

  // Fetch ALL progress entries (weight + photos)
  const { data: entries = [], isLoading: entriesLoading, refetch: refetchEntries } = useQuery({
    queryKey: ['progress-entries'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('progress_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('entry_date', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Separate weight and photo entries
  const weightEntries = entries.filter(e => (e.metrics as any)?.weight);
  const photoEntries = entries.filter(e => e.photo_url);

  const { data: compounds = [], isLoading: compoundsLoading } = useQuery({
    queryKey: ['compounds'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('compounds')
        .select('*')
        .eq('user_id', user.id)
        .order('start_date', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
  });

  const { data: doses = [], isLoading: dosesLoading } = useQuery({
    queryKey: ['doses'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('doses')
        .select('*')
        .eq('user_id', user.id)
        .eq('taken', true)
        .order('taken_at', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
  });

  const { data: stats } = useStreaks();

  const isLoading = entriesLoading || compoundsLoading || dosesLoading;

  // Preload signed URLs for all photos
  useEffect(() => {
    const loadPhotoUrls = async () => {
      const photoEntries = entries.filter(e => e.photo_url);
      const urls: Record<string, string> = {};
      
      await Promise.all(
        photoEntries.map(async (entry) => {
          const signedUrl = await getSignedUrl('progress-photos', entry.photo_url);
          if (signedUrl) {
            urls[entry.photo_url] = signedUrl;
          }
        })
      );
      
      setPhotoUrls(urls);
    };
    
    if (entries.length > 0) {
      loadPhotoUrls();
    }
  }, [entries]);

  // Calculate date range
  const cutoffDate = useMemo(() => {
    const today = startOfDay(new Date());
    
    if (timeRange === 'ALL') {
      const allDates: Date[] = [];
      entries.forEach(entry => {
        allDates.push(parseISO(entry.entry_date));
      });
      doses.forEach(dose => {
        if (dose.scheduled_date) {
          allDates.push(parseISO(dose.scheduled_date));
        }
      });
      
      if (allDates.length === 0) return subDays(today, 30);
      return new Date(Math.min(...allDates.map(d => d.getTime())));
    }
    
    if (timeRange === '6M') return subMonths(today, 6);
    if (timeRange === '3M') return subMonths(today, 3);
    return subMonths(today, 1);
  }, [timeRange, entries, doses]);

  // Build timeline data
  const timelineData = useMemo((): TimelineDataPoint[] => {
    const today = startOfDay(new Date());
    const daysDiff = differenceInDays(today, cutoffDate);
    const points: TimelineDataPoint[] = [];
    
    for (let i = 0; i <= daysDiff; i++) {
      const date = subDays(today, daysDiff - i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const weightEntry = weightEntries.find(e => e.entry_date === dateStr);
      
      points.push({
        date: format(date, 'MMM d'),
        dateObj: date,
        weight: weightEntry ? (weightEntry.metrics as any)?.weight : undefined,
      });
    }
    
    return points;
  }, [cutoffDate, weightEntries]);

  // Calculate weight stats
  const weightStats = useMemo(() => {
    const weights = weightEntries.map(e => (e.metrics as any)?.weight).filter(Boolean);
    if (weights.length === 0) return null;
    
    const current = weights[weights.length - 1];
    const previous = weights.length > 1 ? weights[weights.length - 2] : current;
    const change = current - previous;
    
    return {
      current,
      change,
      trend: change < 0 ? 'down' : change > 0 ? 'up' : 'stable',
    };
  }, [weightEntries]);

  const weightDomain = useMemo(() => {
    const weights = weightEntries.map(e => (e.metrics as any)?.weight).filter(Boolean);
    if (weights.length === 0) return [0, 300];
    
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    const padding = (max - min) * 0.1 || 10;
    
    return [Math.floor(min - padding), Math.ceil(max + padding)];
  }, [weightEntries]);

  const getPhotoUrl = (photoPath: string) => {
    return photoUrls[photoPath] || null;
  };

  const handleLogWeight = async () => {
    const numWeight = parseFloat(weight);
    if (!numWeight || numWeight <= 0) {
      toast.error("Please enter a valid weight");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const weightLbs = weightUnit === 'kg' ? numWeight * 2.20462 : numWeight;
      const dateStr = format(entryDate, 'yyyy-MM-dd');

      // Check if entry exists for this date
      const { data: existing } = await supabase
        .from('progress_entries')
        .select('id')
        .eq('user_id', user.id)
        .eq('entry_date', dateStr)
        .maybeSingle();

      if (existing) {
        // Update existing entry
        const { error } = await supabase
          .from('progress_entries')
          .update({
            metrics: { weight: weightLbs },
            category: 'weight'
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Insert new entry
        const { error } = await supabase
          .from('progress_entries')
          .insert({
            user_id: user.id,
            entry_date: dateStr,
            metrics: { weight: weightLbs },
            category: 'weight'
          });

        if (error) throw error;
      }

      toast.success("Weight logged!");

      await refetchEntries();
      setShowLogModal(false);
      setWeight("");
    } catch (error: any) {
      console.error("Error logging weight:", error);
      toast.error(error.message || "Failed to log weight");
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (source: CameraSource) => {
    try {
      const image = await CapacitorCamera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source
      });

      if (!image.base64String) {
        toast.error("Failed to capture image");
        return;
      }

      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileName = `${user.id}/${Date.now()}.${image.format}`;
      const { error: uploadError } = await supabase.storage
        .from('progress-photos')
        .upload(fileName, decode(image.base64String), {
          contentType: `image/${image.format}`,
          upsert: false
        });

      if (uploadError) throw uploadError;

      const dateStr = format(photoEntryDate, 'yyyy-MM-dd');

      // Check if entry exists for this date
      const { data: existing } = await supabase
        .from('progress_entries')
        .select('id')
        .eq('user_id', user.id)
        .eq('entry_date', dateStr)
        .maybeSingle();

      if (existing) {
        // Update existing entry
        const { error } = await supabase
          .from('progress_entries')
          .update({
            photo_url: fileName,
            category: 'photo'
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Insert new entry
        const { error: dbError } = await supabase
          .from('progress_entries')
          .insert({
            user_id: user.id,
            entry_date: dateStr,
            photo_url: fileName,
            category: 'photo'
          });

        if (dbError) throw dbError;
      }

      if (Capacitor.isNativePlatform()) {
        await hapticSuccess();
      }

      toast.success("Progress photo uploaded!");
      await refetchEntries();
      setShowPhotoModal(false);
    } catch (error: any) {
      console.error("Error uploading photo:", error);
      toast.error(error.message || "Failed to upload photo");
    } finally {
      setLoading(false);
    }
  };

  const decode = (base64: string): Blob => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new Blob([bytes]);
  };

  const handleDeletePhoto = async (entryId: string) => {
    try {
      const photoEntry = photoEntries.find(p => p.id === entryId);
      if (!photoEntry) return;

      const { error: storageError } = await supabase.storage
        .from('progress-photos')
        .remove([photoEntry.photo_url]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('progress_entries')
        .delete()
        .eq('id', entryId);

      if (dbError) throw dbError;

      await refetchEntries();
      toast.success("Photo deleted successfully");
      setSelectedPhoto(null);
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast.error("Failed to delete photo");
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
          <p className="text-xs font-medium text-foreground mb-1">{payload[0].payload.date}</p>
          {payload[0].value && (
            <p className="text-sm font-semibold text-primary">
              {payload[0].value.toFixed(1)} lbs
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading progress...</p>
        </div>
      </div>
    );
  }

  const currentStreak = stats?.current_streak || 0;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="p-4 space-y-6 max-w-4xl mx-auto">
        {/* Header with current weight */}
        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-foreground">Progress</h1>
          
          {/* Current Weight Display */}
          {weightStats && (
            <Card className="p-5 bg-gradient-to-br from-primary/10 to-primary/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Scale className="w-8 h-8 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Current Weight</p>
                    <p className="text-3xl font-bold text-foreground">{weightStats.current}</p>
                    <p className="text-xs text-muted-foreground">lbs</p>
                  </div>
                </div>
                {weightStats.trend !== 'stable' && (
                  <div className="flex items-center gap-2">
                    {weightStats.trend === 'down' ? (
                      <TrendingDown className="w-5 h-5 text-green-500" />
                    ) : (
                      <TrendingUp className="w-5 h-5 text-orange-500" />
                    )}
                    <span className={cn(
                      "text-sm font-semibold",
                      weightStats.trend === 'down' ? "text-green-500" : "text-orange-500"
                    )}>
                      {Math.abs(weightStats.change).toFixed(1)} lbs
                    </span>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Streak Badge (optional, small) */}
          {currentStreak > 0 && (
            <Card className="p-3 bg-muted/30 ring-2 ring-primary/20 shadow-[0_0_16px_rgba(255,111,97,0.12)]">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" fill="currentColor" />
                <p className="text-sm text-muted-foreground">
                  <span className="font-bold text-foreground">{currentStreak}</span> day streak
                </p>
              </div>
            </Card>
          )}
        </div>

        {/* Timeline Selector */}
        <div className="pt-3 border-t border-border/50">
          <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Timeline</h3>
          <div className="flex gap-1 bg-secondary p-1 rounded-lg w-fit">
            {(['1M', '3M', '6M', 'ALL'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium transition-all",
                  timeRange === range
                    ? 'bg-background text-primary shadow-sm'
                    : 'text-foreground/70 hover:text-foreground'
                )}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* Weight Graph */}
        <Card className="p-4 bg-muted/30">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold text-foreground">Weight Over Time</h3>
            <Button onClick={() => setShowLogModal(true)} size="sm" variant="default">
              <Scale className="w-3 h-3 mr-1" />
              Log Weight
            </Button>
          </div>
          {timelineData.length === 0 || !weightEntries.length ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-center">
              <p className="text-muted-foreground text-sm mb-2">No weight data yet</p>
              <p className="text-xs text-muted-foreground">Log your weight to track progress</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={timelineData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  hide
                  interval={0}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  domain={weightDomain}
                  width={50}
                  label={{ value: 'lbs', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: 'hsl(var(--muted-foreground))' } }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="weight" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Progress Tracking Timeline */}
        <Card className="p-4 bg-muted/30">
          <h3 className="text-sm font-semibold text-foreground mb-3">Progress Tracking</h3>
          <div className="flex-1 relative h-16 bg-muted/20 rounded-sm">
            {/* Weight entries - blue dots */}
            {weightEntries
              .filter(entry => parseISO(entry.entry_date) >= cutoffDate)
              .map((entry) => {
                const timelineIndex = timelineData.findIndex(
                  t => format(t.dateObj, 'yyyy-MM-dd') === entry.entry_date
                );
                
                if (timelineIndex === -1) return null;
                
                const position = (timelineIndex / (timelineData.length - 1)) * 100;
                const weight = (entry.metrics as any)?.weight;
                
                return (
                  <div
                    key={`weight-${entry.id}`}
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                    style={{ left: `${position}%` }}
                    title={`${format(parseISO(entry.entry_date), 'MMM d')}: ${weight}lbs`}
                  >
                    <div className="w-2.5 h-2.5 rounded-full border-2 border-background bg-blue-500" />
                  </div>
                );
              })}
            
            {/* Photo entries - small indicators (click to jump to photo in gallery) */}
            {photoEntries
              .filter(entry => parseISO(entry.entry_date) >= cutoffDate)
              .map((entry) => {
                const timelineIndex = timelineData.findIndex(
                  t => format(t.dateObj, 'yyyy-MM-dd') === entry.entry_date
                );
                
                if (timelineIndex === -1) return null;
                
                const position = (timelineIndex / (timelineData.length - 1)) * 100;
                
                return (
                  <div
                    key={`photo-${entry.id}`}
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 cursor-pointer hover:scale-125 transition-transform"
                    style={{ left: `${position}%` }}
                    onClick={() => {
                      // Scroll to photo section and highlight it
                      const photoElement = document.getElementById(`photo-${entry.id}`);
                      if (photoElement) {
                        photoElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        photoElement.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
                        setTimeout(() => {
                          photoElement.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
                        }, 2000);
                      }
                    }}
                    title={`Photo: ${format(parseISO(entry.entry_date), 'MMM d')}`}
                  >
                    <div className="w-2.5 h-2.5 rounded-full border-2 border-primary bg-primary/80" />
                  </div>
                );
              })}
          </div>
        </Card>

        {/* Medication Tracking */}
        {compounds.length > 0 && (
          <Card className="p-4 bg-muted/30">
            <h3 className="text-sm font-semibold text-foreground mb-3">Medications</h3>
            <div className="space-y-2">
              {compounds.map((compound, idx) => {
                const color = MEDICATION_COLORS[idx % MEDICATION_COLORS.length];
                
                const loggedDoses = doses
                  .filter(d => d.compound_id === compound.id && d.taken && d.scheduled_date)
                  .map(d => {
                    const doseDate = parseISO(d.scheduled_date);
                    return {
                      date: doseDate,
                      dateStr: d.scheduled_date,
                      amount: d.dose_amount,
                      unit: d.dose_unit,
                    };
                  })
                  .filter(d => d.date >= cutoffDate)
                  .sort((a, b) => a.date.getTime() - b.date.getTime());
                
                if (loggedDoses.length === 0) return null;
                
                return (
                  <div key={compound.id} className="flex items-center gap-3">
                    <div className="w-24 flex-shrink-0">
                      <span className="text-xs font-medium text-foreground">{compound.name}</span>
                    </div>
                    <div className="flex-1 relative h-8 bg-muted/20 rounded-sm">
                      {loggedDoses.map((dose, doseIdx) => {
                        const timelineIndex = timelineData.findIndex(
                          t => format(t.dateObj, 'yyyy-MM-dd') === dose.dateStr
                        );
                        
                        if (timelineIndex === -1) return null;
                        
                        const position = (timelineIndex / (timelineData.length - 1)) * 100;
                        
                        return (
                          <div
                            key={doseIdx}
                            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                            style={{ left: `${position}%` }}
                            title={`${format(dose.date, 'MMM d')}: ${dose.amount}${dose.unit}`}
                          >
                            <div
                              className="w-2.5 h-2.5 rounded-full border-2 border-background"
                              style={{ backgroundColor: color }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }).filter(Boolean)}
            </div>
          </Card>
        )}

        {/* Visual Progress (Photos) */}
        <Card className="p-4 bg-muted/30">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Visual Progress</h3>
            </div>
            <div className="flex gap-2">
              {photoEntries.length >= 2 && isSubscribed && (
                <Button 
                  onClick={() => navigate('/progress/compare')}
                  size="sm"
                  variant="outline"
                  className="border-secondary/50 text-secondary hover:bg-secondary/10 hover:text-secondary"
                >
                  Compare
                </Button>
              )}
              <Button 
                onClick={() => isSubscribed ? setShowPhotoModal(true) : setShowPaywall(true)} 
                size="sm"
                variant="default"
              >
                <CameraIconLucide className="w-3 h-3 mr-1" />
                {isSubscribed ? "Upload Photo" : "Subscribe"}
              </Button>
            </div>
          </div>

          {photoEntries.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto pb-2 scroll-smooth" style={{ scrollBehavior: 'smooth' }}>
              {photoEntries.map((entry) => {
                const photoUrl = getPhotoUrl(entry.photo_url);
                return (
                  <div key={entry.id} id={`photo-${entry.id}`} className="flex-shrink-0 text-center transition-all duration-300">
                    <div 
                      className="w-32 h-40 rounded-lg overflow-hidden bg-muted cursor-pointer hover:opacity-80 hover:scale-105 transition-all border-2 border-border"
                      onClick={() => photoUrl && setSelectedPhoto({ 
                        url: photoUrl, 
                        date: format(parseISO(entry.entry_date), 'MMM d, yyyy'),
                        id: entry.id
                      })}
                    >
                      {photoUrl && (
                        <img
                          src={photoUrl}
                          alt={`Progress ${entry.entry_date}`}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      {format(parseISO(entry.entry_date), 'MMM d')}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No photos yet</p>
              <p className="text-xs mt-1">Upload your first progress photo</p>
            </div>
          )}
        </Card>
      </div>

      <BottomNavigation />
      
      {/* Log Weight Dialog */}
      <Dialog open={showLogModal} onOpenChange={setShowLogModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Log Weight</DialogTitle>
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
              <Label>Date</Label>
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

      {/* Upload Photo Dialog */}
      <Dialog open={showPhotoModal} onOpenChange={setShowPhotoModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Upload Progress Photo</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Photo Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-14 justify-between text-left font-normal",
                      !photoEntryDate && "text-muted-foreground"
                    )}
                  >
                    <span>Entry Date</span>
                    <span>{format(photoEntryDate, "MMM d, yyyy")}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={photoEntryDate}
                    onSelect={(date) => date && setPhotoEntryDate(date)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => handlePhotoUpload(CameraSource.Camera)}
                disabled={loading}
                variant="outline"
                className="h-24 flex flex-col gap-2"
              >
                <CameraIconLucide className="w-8 h-8" />
                <span>Take Photo</span>
              </Button>
              <Button
                onClick={() => handlePhotoUpload(CameraSource.Photos)}
                disabled={loading}
                variant="outline"
                className="h-24 flex flex-col gap-2"
              >
                <Camera className="w-8 h-8" />
                <span>Choose from Library</span>
              </Button>
            </div>

            {loading && (
              <div className="text-center text-sm text-muted-foreground">
                Uploading photo...
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Photo Preview Modal */}
      {selectedPhoto && (
        <PhotoPreviewModal
          open={!!selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
          photoUrl={selectedPhoto.url}
          entryId={selectedPhoto.id}
          onDelete={handleDeletePhoto}
          onDateUpdate={refetchEntries}
        />
      )}

      {/* Subscription Paywall */}
      <SubscriptionPaywall 
        open={showPaywall} 
        onOpenChange={setShowPaywall} 
      />
    </div>
  );
};
