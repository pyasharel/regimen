import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, startOfDay, eachDayOfInterval } from 'date-fns';

interface GrowthData {
  date: string;
  signups: number;
  cumulative: number;
}

export const UserGrowthChart = () => {
  const [data, setData] = useState<GrowthData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchGrowthData = async () => {
      try {
        const endDate = new Date();
        const startDate = subDays(endDate, 30);

        // Get all profiles with their creation dates
        const { data: profiles } = await supabase
          .from('profiles')
          .select('created_at')
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: true });

        // Generate all days in the range
        const days = eachDayOfInterval({ start: startDate, end: endDate });
        
        // Count signups per day
        const dailyCounts: Record<string, number> = {};
        days.forEach(day => {
          dailyCounts[format(day, 'yyyy-MM-dd')] = 0;
        });

        profiles?.forEach(profile => {
          const day = format(new Date(profile.created_at), 'yyyy-MM-dd');
          if (dailyCounts[day] !== undefined) {
            dailyCounts[day]++;
          }
        });

        // Get total count before start date for cumulative
        const { count: previousCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .lt('created_at', startDate.toISOString());

        // Build chart data with cumulative
        let cumulative = previousCount || 0;
        const chartData: GrowthData[] = days.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const signups = dailyCounts[dateStr] || 0;
          cumulative += signups;
          return {
            date: format(day, 'MMM d'),
            signups,
            cumulative
          };
        });

        setData(chartData);
      } catch (error) {
        console.error('Error fetching growth data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGrowthData();
  }, []);

  if (isLoading) {
    return (
      <Card className="h-[300px] animate-pulse">
        <CardContent className="p-4 h-full flex items-center justify-center">
          <div className="h-full w-full bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-[300px]">
      <CardContent className="p-4 h-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Line 
              type="monotone" 
              dataKey="cumulative" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              dot={false}
              name="Total Users"
            />
            <Line 
              type="monotone" 
              dataKey="signups" 
              stroke="hsl(var(--chart-2))" 
              strokeWidth={2}
              dot={false}
              name="New Signups"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
