import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface FeatureUsage {
  feature: string;
  users: number;
  usageCount: number;
  percentOfUsers: number;
}

export const FeatureUsageTable = () => {
  const [data, setData] = useState<FeatureUsage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFeatureUsage = async () => {
      try {
        // Get total users count
        const { count: totalUsers } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        // Get feature events
        const { data: activities } = await supabase
          .from('user_activity')
          .select('event_name, user_id')
          .eq('event_type', 'feature');

        if (!activities || !totalUsers) {
          setIsLoading(false);
          return;
        }

        // Aggregate by feature
        const featureStats: Record<string, { users: Set<string>; count: number }> = {};
        
        activities.forEach(activity => {
          const feature = activity.event_name;
          if (!featureStats[feature]) {
            featureStats[feature] = { users: new Set(), count: 0 };
          }
          featureStats[feature].users.add(activity.user_id);
          featureStats[feature].count++;
        });

        // Convert to array and calculate percentages
        const featureData: FeatureUsage[] = Object.entries(featureStats)
          .map(([feature, stats]) => ({
            feature: formatFeatureName(feature),
            users: stats.users.size,
            usageCount: stats.count,
            percentOfUsers: (stats.users.size / totalUsers) * 100
          }))
          .sort((a, b) => b.usageCount - a.usageCount);

        setData(featureData);
      } catch (error) {
        console.error('Error fetching feature usage:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeatureUsage();
  }, []);

  const formatFeatureName = (name: string) => {
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-4">
          <div className="h-64 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          No feature usage data yet. Data will appear as users interact with the app.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Feature</TableHead>
              <TableHead className="text-right">Users</TableHead>
              <TableHead className="text-right">Usage Count</TableHead>
              <TableHead className="text-right">% of Users</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.feature}>
                <TableCell className="font-medium">{row.feature}</TableCell>
                <TableCell className="text-right">{row.users.toLocaleString()}</TableCell>
                <TableCell className="text-right">{row.usageCount.toLocaleString()}</TableCell>
                <TableCell className="text-right">{row.percentOfUsers.toFixed(1)}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
