import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Crown, Camera, Pill, Scale, ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { 
  ComposedChart, 
  Line, 
  Scatter,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  Legend
} from 'recharts';

type TimelineDataPoint = {
  date: string;
  dateObj: Date;
  weight?: number;
  photo?: string;
  dose?: {
    compound: string;
    amount: number;
    unit: string;
  };
  medicationStart?: {
    name: string;
    dose: number;
    unit: string;
  };
};

export const InsightsScreen = () => {
  const navigate = useNavigate();
  const [showWeight, setShowWeight] = useState(true);
  const [showPhotos, setShowPhotos] = useState(true);
  const [showDoses, setShowDoses] = useState(true);
  const [showMedicationStarts, setShowMedicationStarts] = useState(true);
  const [isPremium, setIsPremium] = useState(() => 
    localStorage.getItem('testPremiumMode') === 'true'
  );

  // Fetch all data
  const { data: entries = [] } = useQuery({
    queryKey: ['progress-entries-insights'],
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

  const { data: compounds = [] } = useQuery({
    queryKey: ['compounds-insights'],
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

  const { data: doses = [] } = useQuery({
    queryKey: ['doses-insights'],
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
        .order('taken_at', { ascending: true })
        .limit(100);
      
      if (error) throw error;
      return data || [];
    },
  });

  // Combine all data into unified timeline
  const timelineData: TimelineDataPoint[] = [];
  const dataMap = new Map<string, TimelineDataPoint>();

  // Add weight entries
  entries.forEach(entry => {
    const metrics = entry.metrics as any;
    if (metrics?.weight) {
      const dateKey = entry.entry_date;
      if (!dataMap.has(dateKey)) {
        dataMap.set(dateKey, {
          date: format(new Date(entry.entry_date), 'MMM d'),
          dateObj: new Date(entry.entry_date),
          weight: metrics.weight,
        });
      } else {
        dataMap.get(dateKey)!.weight = metrics.weight;
      }
    }
  });

  // Add photo entries
  entries.forEach(entry => {
    if (entry.photo_url) {
      const dateKey = entry.entry_date;
      if (!dataMap.has(dateKey)) {
        dataMap.set(dateKey, {
          date: format(new Date(entry.entry_date), 'MMM d'),
          dateObj: new Date(entry.entry_date),
          photo: entry.photo_url,
        });
      } else {
        dataMap.get(dateKey)!.photo = entry.photo_url;
      }
    }
  });

  // Add medication starts
  compounds.forEach(compound => {
    const dateKey = compound.start_date;
    if (!dataMap.has(dateKey)) {
      dataMap.set(dateKey, {
        date: format(new Date(compound.start_date), 'MMM d'),
        dateObj: new Date(compound.start_date),
        medicationStart: {
          name: compound.name,
          dose: compound.intended_dose,
          unit: compound.dose_unit,
        },
      });
    } else {
      dataMap.get(dateKey)!.medicationStart = {
        name: compound.name,
        dose: compound.intended_dose,
        unit: compound.dose_unit,
      };
    }
  });

  // Convert to array and sort
  const sortedData = Array.from(dataMap.values()).sort((a, b) => 
    a.dateObj.getTime() - b.dateObj.getTime()
  );

  // Get medication start dates for reference lines
  const medicationStarts = compounds.map(c => ({
    date: c.start_date,
    name: c.name,
    dateFormatted: format(new Date(c.start_date), 'MMM d'),
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as TimelineDataPoint;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-sm mb-2">{data.date}</p>
          {data.weight && (
            <p className="text-sm flex items-center gap-2">
              <Scale className="w-3 h-3" />
              <span>{data.weight} lbs</span>
            </p>
          )}
          {data.photo && (
            <p className="text-sm flex items-center gap-2">
              <Camera className="w-3 h-3" />
              <span>Progress photo</span>
            </p>
          )}
          {data.dose && (
            <p className="text-sm flex items-center gap-2">
              <Pill className="w-3 h-3" />
              <span>{data.dose.compound}: {data.dose.amount}{data.dose.unit}</span>
            </p>
          )}
          {data.medicationStart && (
            <p className="text-sm flex items-center gap-2 text-primary font-medium">
              <Pill className="w-3 h-3" />
              <span>Started {data.medicationStart.name}</span>
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-background safe-top" style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' }}>
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border px-4 py-4 bg-background/95 backdrop-blur-sm safe-top">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate('/progress')}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
            <h1 className="text-xl font-bold bg-gradient-to-r from-[#FF6F61] to-[#8B5CF6] bg-clip-text text-transparent">
              REGIMEN
            </h1>
            {isPremium && (
              <Crown className="h-5 w-5 text-primary" />
            )}
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Timeline Insights</h2>
          <p className="text-sm text-muted-foreground">
            See how your medications, weight, and progress connect over time
          </p>
        </div>

        {/* Toggle Controls */}
        <Card className="p-4 bg-muted/30">
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
            Show on Timeline
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="weight-toggle" className="text-sm cursor-pointer flex items-center gap-2">
                <Scale className="w-4 h-4" />
                Weight
              </Label>
              <Switch
                id="weight-toggle"
                checked={showWeight}
                onCheckedChange={setShowWeight}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="photos-toggle" className="text-sm cursor-pointer flex items-center gap-2">
                <Camera className="w-4 h-4" />
                Photos
              </Label>
              <Switch
                id="photos-toggle"
                checked={showPhotos}
                onCheckedChange={setShowPhotos}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="meds-toggle" className="text-sm cursor-pointer flex items-center gap-2">
                <Pill className="w-4 h-4" />
                Med Starts
              </Label>
              <Switch
                id="meds-toggle"
                checked={showMedicationStarts}
                onCheckedChange={setShowMedicationStarts}
              />
            </div>
          </div>
        </Card>

        {/* Unified Timeline Chart */}
        <Card className="p-4 bg-muted/30">
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={sortedData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis 
                dataKey="date" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                yAxisId="weight"
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
              <Tooltip content={<CustomTooltip />} />
              
              {/* Weight Line */}
              {showWeight && (
                <Line 
                  yAxisId="weight"
                  type="monotone" 
                  dataKey="weight" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--primary))', r: 5 }}
                  activeDot={{ r: 7 }}
                  connectNulls
                />
              )}

              {/* Photos */}
              {showPhotos && (
                <Scatter
                  yAxisId="weight"
                  dataKey="weight"
                  data={sortedData.filter(d => d.photo)}
                  fill="hsl(var(--secondary))"
                  shape={(props: any) => {
                    const { cx, cy } = props;
                    return (
                      <g>
                        <circle cx={cx} cy={cy} r={8} fill="hsl(var(--secondary))" opacity={0.8} />
                        <Camera x={cx - 5} y={cy - 5} width={10} height={10} stroke="white" strokeWidth={1} />
                      </g>
                    );
                  }}
                />
              )}

              {/* Medication Start Lines */}
              {showMedicationStarts && medicationStarts.map((med, idx) => (
                <ReferenceLine
                  key={`med-${idx}`}
                  yAxisId="weight"
                  x={med.dateFormatted}
                  stroke="hsl(var(--primary))"
                  strokeDasharray="3 3"
                  strokeWidth={2}
                  label={{
                    value: med.name,
                    position: 'top',
                    fill: 'hsl(var(--foreground))',
                    fontSize: 10,
                    angle: -45,
                  }}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </Card>

        {/* Key Insights */}
        <Card className="p-4 bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
          <h3 className="text-sm font-semibold mb-2 text-foreground">💡 Key Insights</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Vertical dashed lines show when you started new medications</li>
            <li>• Camera icons mark progress photo entries</li>
            <li>• Hover over any point to see detailed information</li>
            <li>• Track correlations between medication starts and weight changes</li>
          </ul>
        </Card>
      </div>

      <BottomNavigation />
    </div>
  );
};
