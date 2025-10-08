import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Camera, Plus, Crown } from "lucide-react";
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
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type ProgressEntry = {
  id: string;
  entry_date: string;
  metrics: any;
  photo_url: string | null;
  notes: string | null;
};

type TimeFrame = "1M" | "3M" | "6M" | "1Y" | "All";

type Compound = {
  id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
};

export const ProgressScreen = () => {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [compounds, setCompounds] = useState<Compound[]>([]);
  const [recentDoses, setRecentDoses] = useState<any[]>([]);
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

  useEffect(() => {
    // Fetch all data in parallel for better performance
    Promise.all([
      fetchEntries(),
      fetchCompounds(),
      fetchRecentDoses()
    ]);
    
    // Check premium status from localStorage
    const checkPremium = () => {
      const premiumStatus = localStorage.getItem('testPremiumMode') === 'true';
      setIsPremium(premiumStatus);
    };
    
    checkPremium();
    window.addEventListener('storage', checkPremium);
    return () => window.removeEventListener('storage', checkPremium);
  }, []);

  const fetchEntries = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('progress_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('entry_date', { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error('Error fetching entries:', error);
      toast.error('Failed to load progress entries');
    }
  };

  const fetchCompounds = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('compounds')
        .select('id, name, start_date, end_date, is_active')
        .eq('user_id', user.id)
        .order('start_date', { ascending: false });

      if (error) throw error;
      setCompounds(data || []);
    } catch (error) {
      console.error('Error fetching compounds:', error);
    }
  };

  const fetchRecentDoses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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
      setRecentDoses(data || []);
    } catch (error) {
      console.error('Error fetching recent doses:', error);
    }
  };

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
      const weightInLbs = weightUnit === 'kg' ? weightValue * 2.20462 : weightValue;

      const { error } = await supabase
        .from('progress_entries')
        .insert([{
          user_id: user.id,
          entry_date: format(entryDate, 'yyyy-MM-dd'),
          category: 'weight',
          metrics: { weight: weightInLbs }
        }]);

      if (error) throw error;

      toast.success('Weight logged successfully');
      setShowLogModal(false);
      setWeight("");
      fetchEntries();
    } catch (error) {
      console.error('Error logging weight:', error);
      toast.error('Failed to log weight');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadPhoto = async () => {
    if (!photoFile) {
      toast.error('Please select a photo');
      return;
    }

    if (!isPremium) {
      toast.error('Photo upload is a premium feature');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileName = `${user.id}/${Date.now()}-${photoFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('progress-photos')
        .upload(fileName, photoFile);

      if (uploadError) throw uploadError;

      const { error: entryError } = await supabase
        .from('progress_entries')
        .insert([{
          user_id: user.id,
          entry_date: format(entryDate, 'yyyy-MM-dd'),
          category: 'photo',
          photo_url: fileName
        }]);

      if (entryError) throw entryError;

      toast.success('Photo uploaded successfully');
      setShowPhotoModal(false);
      setPhotoFile(null);
      fetchEntries();
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Failed to upload photo');
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

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="p-6 space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold text-foreground">Progress</h1>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-foreground">Weight Progress</h2>
            <Button onClick={() => setShowLogModal(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Log Weight
            </Button>
          </div>

          {currentWeight && (
            <div className="flex items-baseline gap-6">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold text-foreground">{currentWeight}</span>
                  <span className="text-xl text-muted-foreground">lbs</span>
                </div>
                <div className="text-sm text-muted-foreground mt-1">Current</div>
              </div>
            </div>
          )}

          <div className="flex gap-1 bg-secondary p-1 rounded-lg w-fit">
            {(["1M", "3M", "6M", "1Y", "All"] as TimeFrame[]).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeFrame(tf)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  timeFrame === tf
                    ? 'bg-background text-primary shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          <Card className="p-4 bg-muted/30">
            {chartData.length > 0 ? (
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
            {isPremium && (
              <Button onClick={() => setShowPhotoModal(true)} size="sm">
                <Camera className="w-4 h-4 mr-2" />
                Upload Photo
              </Button>
            )}
          </div>

          {photoEntries.length > 0 ? (
            <>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {photoEntries.map((entry) => (
                  <div key={entry.id} className="flex-shrink-0 text-center">
                    <div className="w-24 h-32 rounded-lg overflow-hidden bg-muted">
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
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => navigate("/progress/compare")}
                >
                  View All Photos & Compare
                </Button>
              )}
            </>
          ) : (
            <>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="flex-shrink-0">
                    <Card className="w-24 h-32 bg-card border-2 border-dashed border-border hover:border-primary/50 transition-colors flex items-center justify-center relative group">
                      <Camera className="w-8 h-8 text-muted-foreground/40 group-hover:text-primary/60 transition-colors" />
                      {!isPremium && (
                        <div className="absolute top-2 right-2">
                          <Crown className="w-4 h-4 text-primary/70" />
                        </div>
                      )}
                    </Card>
                  </div>
                ))}
              </div>

              {!isPremium && (
                <div className="text-center py-3">
                  <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowPremiumModal(true)}>
                    <Crown className="w-4 h-4" />
                    Unlock Premium
                  </Button>
                </div>
              )}
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
                    const isActive = compound.is_active && !compound.end_date;
                    
                    const now = new Date();
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
            <DialogTitle>Upload Progress Photo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="photo">Select Photo</Label>
              <Input
                id="photo"
                type="file"
                accept="image/*"
                onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
              />
              {photoFile && (
                <div className="mt-2 text-sm text-muted-foreground">
                  Selected: {photoFile.name}
                </div>
              )}
            </div>
            <Button onClick={handleUploadPhoto} disabled={loading || !photoFile} className="w-full">
              {loading ? 'Uploading...' : 'Upload Photo'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <PremiumModal open={showPremiumModal} onOpenChange={setShowPremiumModal} />
    </div>
  );
};
