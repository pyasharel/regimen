import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { format, subWeeks, startOfWeek, endOfWeek, addDays, differenceInDays } from 'date-fns';

interface CohortData {
  cohort: string;
  week0: number;
  week1: number;
  week2: number;
  week3: number;
  week4: number;
  totalUsers: number;
}

export const CohortRetention = () => {
  const [data, setData] = useState<CohortData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCohortData = async () => {
      try {
        const now = new Date();
        const cohorts: CohortData[] = [];

        // Get last 5 weeks of cohorts
        for (let i = 4; i >= 0; i--) {
          const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
          const weekEnd = endOfWeek(subWeeks(now, i), { weekStartsOn: 1 });

          // Get users who signed up in this cohort
          const { data: cohortUsers } = await supabase
            .from('profiles')
            .select('user_id, created_at, last_active_at')
            .gte('created_at', weekStart.toISOString())
            .lte('created_at', weekEnd.toISOString());

          if (!cohortUsers || cohortUsers.length === 0) {
            cohorts.push({
              cohort: format(weekStart, 'MMM d'),
              week0: 100,
              week1: 0,
              week2: 0,
              week3: 0,
              week4: 0,
              totalUsers: 0
            });
            continue;
          }

          const totalUsers = cohortUsers.length;
          const retentionByWeek = [100, 0, 0, 0, 0]; // Week 0 is always 100%

          // Calculate retention for each subsequent week
          for (let week = 1; week <= 4; week++) {
            if (i + week > 4) break; // Don't calculate future weeks
            
            const weekStartTarget = addDays(weekStart, week * 7);
            const weekEndTarget = addDays(weekStartTarget, 7);

            const activeInWeek = cohortUsers.filter(user => {
              if (!user.last_active_at) return false;
              const lastActive = new Date(user.last_active_at);
              return lastActive >= weekStartTarget && lastActive < weekEndTarget;
            }).length;

            retentionByWeek[week] = (activeInWeek / totalUsers) * 100;
          }

          cohorts.push({
            cohort: format(weekStart, 'MMM d'),
            week0: retentionByWeek[0],
            week1: retentionByWeek[1],
            week2: retentionByWeek[2],
            week3: retentionByWeek[3],
            week4: retentionByWeek[4],
            totalUsers
          });
        }

        setData(cohorts);
      } catch (error) {
        console.error('Error fetching cohort data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCohortData();
  }, []);

  const getRetentionColor = (value: number) => {
    if (value >= 60) return 'bg-green-500/80';
    if (value >= 40) return 'bg-green-500/60';
    if (value >= 20) return 'bg-green-500/40';
    if (value > 0) return 'bg-green-500/20';
    return 'bg-muted';
  };

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-4">
          <div className="h-48 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left py-2 px-3 text-muted-foreground font-medium">Cohort</th>
              <th className="text-center py-2 px-3 text-muted-foreground font-medium">Users</th>
              <th className="text-center py-2 px-3 text-muted-foreground font-medium">Week 0</th>
              <th className="text-center py-2 px-3 text-muted-foreground font-medium">Week 1</th>
              <th className="text-center py-2 px-3 text-muted-foreground font-medium">Week 2</th>
              <th className="text-center py-2 px-3 text-muted-foreground font-medium">Week 3</th>
              <th className="text-center py-2 px-3 text-muted-foreground font-medium">Week 4</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.cohort}>
                <td className="py-2 px-3 font-medium text-foreground">{row.cohort}</td>
                <td className="py-2 px-3 text-center text-muted-foreground">{row.totalUsers}</td>
                <td className="py-1 px-1">
                  <div className={`rounded py-1.5 text-center text-white font-medium ${getRetentionColor(row.week0)}`}>
                    {row.week0.toFixed(0)}%
                  </div>
                </td>
                <td className="py-1 px-1">
                  <div className={`rounded py-1.5 text-center text-white font-medium ${getRetentionColor(row.week1)}`}>
                    {row.week1.toFixed(0)}%
                  </div>
                </td>
                <td className="py-1 px-1">
                  <div className={`rounded py-1.5 text-center text-white font-medium ${getRetentionColor(row.week2)}`}>
                    {row.week2.toFixed(0)}%
                  </div>
                </td>
                <td className="py-1 px-1">
                  <div className={`rounded py-1.5 text-center text-white font-medium ${getRetentionColor(row.week3)}`}>
                    {row.week3.toFixed(0)}%
                  </div>
                </td>
                <td className="py-1 px-1">
                  <div className={`rounded py-1.5 text-center text-white font-medium ${getRetentionColor(row.week4)}`}>
                    {row.week4.toFixed(0)}%
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
};
