import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Activity, CreditCard, Clock, TrendingUp, UserCheck } from 'lucide-react';
import { subDays } from 'date-fns';

interface OverviewStats {
  totalUsers: number;
  activeUsers7d: number;
  activeUsers30d: number;
  subscribers: number;
  conversionRate: number;
  avgSessionDuration: number;
  retention7d: number;
}

export const OverviewCards = () => {
  const [stats, setStats] = useState<OverviewStats>({
    totalUsers: 0,
    activeUsers7d: 0,
    activeUsers30d: 0,
    subscribers: 0,
    conversionRate: 0,
    avgSessionDuration: 0,
    retention7d: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Get total users
        const { count: totalUsers } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        // Get active users in last 7 days
        const sevenDaysAgo = subDays(new Date(), 7).toISOString();
        const { count: activeUsers7d } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gte('last_active_at', sevenDaysAgo);

        // Get active users in last 30 days
        const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
        const { count: activeUsers30d } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gte('last_active_at', thirtyDaysAgo);

        // Get subscribers
        const { count: subscribers } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('subscription_status', 'active');

        // Calculate conversion rate
        const conversionRate = totalUsers && totalUsers > 0 
          ? ((subscribers || 0) / totalUsers) * 100 
          : 0;

        // Get average session duration from activity logs
        const { data: sessionData } = await supabase
          .from('user_activity')
          .select('duration_seconds')
          .eq('event_name', 'session_end')
          .not('duration_seconds', 'is', null);

        const avgSessionDuration = sessionData && sessionData.length > 0
          ? sessionData.reduce((acc, curr) => acc + (curr.duration_seconds || 0), 0) / sessionData.length
          : 0;

        // Calculate 7-day retention (users active 7 days after signup)
        const { data: recentSignups } = await supabase
          .from('profiles')
          .select('user_id, created_at')
          .gte('created_at', subDays(new Date(), 14).toISOString())
          .lte('created_at', subDays(new Date(), 7).toISOString());

        let retention7d = 0;
        if (recentSignups && recentSignups.length > 0) {
          const userIds = recentSignups.map(u => u.user_id);
          const { count: retainedCount } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .in('user_id', userIds)
            .gte('last_active_at', sevenDaysAgo);
          
          retention7d = ((retainedCount || 0) / recentSignups.length) * 100;
        }

        setStats({
          totalUsers: totalUsers || 0,
          activeUsers7d: activeUsers7d || 0,
          activeUsers30d: activeUsers30d || 0,
          subscribers: subscribers || 0,
          conversionRate,
          avgSessionDuration: Math.round(avgSessionDuration),
          retention7d
        });
      } catch (error) {
        console.error('Error fetching overview stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  const cards = [
    {
      title: 'Total Users',
      value: stats.totalUsers.toLocaleString(),
      icon: Users,
      color: 'text-blue-500'
    },
    {
      title: 'Active (7d)',
      value: stats.activeUsers7d.toLocaleString(),
      icon: Activity,
      color: 'text-green-500'
    },
    {
      title: 'Active (30d)',
      value: stats.activeUsers30d.toLocaleString(),
      icon: UserCheck,
      color: 'text-purple-500'
    },
    {
      title: 'Subscribers',
      value: stats.subscribers.toLocaleString(),
      icon: CreditCard,
      color: 'text-amber-500'
    },
    {
      title: 'Conversion Rate',
      value: `${stats.conversionRate.toFixed(1)}%`,
      icon: TrendingUp,
      color: 'text-emerald-500'
    },
    {
      title: 'Avg Session',
      value: formatDuration(stats.avgSessionDuration),
      icon: Clock,
      color: 'text-cyan-500'
    }
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-muted rounded w-20 mb-2" />
              <div className="h-8 bg-muted rounded w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <card.icon className={`h-4 w-4 ${card.color}`} />
              <span className="text-sm text-muted-foreground">{card.title}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{card.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
