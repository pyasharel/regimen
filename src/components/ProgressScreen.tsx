import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Camera, Plus, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

export const ProgressScreen = () => {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [timeFrame, setTimeFrame] = useState<TimeFrame>("3M");
  const [showLogModal, setShowLogModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [weight, setWeight] = useState("");
  const [weightUnit, setWeightUnit] = useState<"lbs" | "kg">("lbs");
  const [entryDate, setEntryDate] = useState<Date>(new Date());
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPremium, setIsPremium] = useState(false); // Toggle for testing premium features

  useEffect(() => {
    fetchEntries();
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

  const handleLogWeight = async () => {
    if (!weight) {
      toast.error('Please enter your weight');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const formattedDate = format(entryDate, 'yyyy-MM-dd');
      const weightValue = parseFloat(weight);
      const weightInLbs = weightUnit === 'kg' ? weightValue * 2.20462 : weightValue;
      
      const { error } = await supabase
        .from('progress_entries')
        .insert({
          user_id: user?.id || null,
          entry_date: formattedDate,
          category: 'general',
          metrics: { weight: weightInLbs, unit: weightUnit },
        });

      if (error) throw error;

      toast.success('Weight logged successfully!');
      setShowLogModal(false);
      setWeight('');
      setEntryDate(new Date());
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

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const today = format(new Date(), 'yyyy-MM-dd');
      const fileExt = photoFile.name.split('.').pop();
      const filePath = `${user.id}/${today}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('progress-photos')
        .upload(filePath, photoFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('progress_entries')
        .upsert({
          user_id: user.id,
          entry_date: today,
          category: 'general',
          photo_url: filePath,
        }, {
          onConflict: 'user_id,entry_date'
        });

      if (dbError) throw dbError;

      toast.success('Photo uploaded successfully!');
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
      case "All":
        return entries;
    }
    
    return entries.filter(e => new Date(e.entry_date) >= cutoffDate);
  };

  const weightEntries = getFilteredEntries().filter(e => e.metrics?.weight);
  const photoEntries = entries.filter(e => e.photo_url).slice(0, 10);
  const currentWeight = entries[0]?.metrics?.weight;

  // Prepare chart data
  const chartData = weightEntries
    .slice()
    .reverse() // Show oldest to newest
    .map(entry => ({
      date: format(new Date(entry.entry_date), 'MMM d'),
      weight: Math.round(entry.metrics.weight * 10) / 10, // Round to 1 decimal
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
        {/* Header with Premium Toggle */}
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold text-foreground">Progress</h1>
          
          {/* Compact Premium Toggle - For Testing */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50">
            <span className="text-xs text-muted-foreground">Premium</span>
            <Switch
              id="premium-toggle"
              checked={isPremium}
              onCheckedChange={setIsPremium}
            />
          </div>
        </div>

        {/* Weight Progress Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-foreground">Weight Progress</h2>
            <Button onClick={() => setShowLogModal(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Log Weight
            </Button>
          </div>

          {/* Current Weight Display */}
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

          {/* Timeframe Selector */}
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

          {/* Graph Container */}
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

        {/* Visual Progress Section */}
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
              {/* Photo Gallery */}
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
                <Button variant="outline" className="w-full">
                  View All Photos & Compare
                </Button>
              )}
            </>
          ) : (
            <>
              {/* Empty State - Show Placeholder Cards */}
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

              {/* Minimal Call to Action for Free Users */}
              {!isPremium && (
                <div className="text-center py-3">
                  <Button size="sm" variant="outline" className="gap-2">
                    <Crown className="w-4 h-4" />
                    Unlock Premium
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border">
        <div className="flex justify-around items-center h-20 pb-6">
          <button onClick={() => navigate("/")} className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
            <Calendar className="w-6 h-6" />
            <span className="text-xs">Today</span>
          </button>
          <button onClick={() => navigate("/add-compound")} className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
            <Plus className="w-6 h-6" />
            <span className="text-xs">Add</span>
          </button>
          <button onClick={() => navigate("/my-stack")} className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
            <div className="w-6 h-6 bg-muted rounded" />
            <span className="text-xs">Stack</span>
          </button>
          <button onClick={() => navigate("/progress")} className="flex flex-col items-center gap-1 text-primary">
            <div className="w-6 h-6 bg-primary rounded" />
            <span className="text-xs font-medium">Progress</span>
          </button>
          <button onClick={() => navigate("/settings")} className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
            <div className="w-6 h-6 bg-muted rounded" />
            <span className="text-xs">Settings</span>
          </button>
        </div>
      </div>

      {/* Log Weight Modal */}
      <Dialog open={showLogModal} onOpenChange={setShowLogModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Weight</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Weight Input with Unit Selector */}
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

            {/* Date Selector */}
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

      {/* Upload Photo Modal */}
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
    </div>
  );
};