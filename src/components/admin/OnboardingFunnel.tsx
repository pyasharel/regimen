import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';

interface FunnelStep {
  step: string;
  count: number;
  percentage: number;
  dropoff: number;
}

const ONBOARDING_STEPS = [
  { id: 'splash', label: 'Splash' },
  { id: 'name', label: 'Name' },
  { id: 'path-selection', label: 'Path Selection' },
  { id: 'experience', label: 'Experience' },
  { id: 'goals', label: 'Goals' },
  { id: 'height-weight', label: 'Height/Weight' },
  { id: 'goal-weight', label: 'Goal Weight' },
  { id: 'medication-setup', label: 'Medication Setup' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'disclaimer', label: 'Disclaimer' },
  { id: 'account-creation', label: 'Account Creation' },
  { id: 'complete', label: 'Complete' }
];

export const OnboardingFunnel = () => {
  const [data, setData] = useState<FunnelStep[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFunnelData = async () => {
      try {
        // Get onboarding step events
        const { data: activities } = await supabase
          .from('user_activity')
          .select('event_name, user_id, metadata')
          .eq('event_type', 'feature')
          .like('event_name', 'onboarding_%');

        if (!activities) {
          setIsLoading(false);
          return;
        }

        // Count unique users per step
        const stepCounts: Record<string, Set<string>> = {};
        ONBOARDING_STEPS.forEach(step => {
          stepCounts[step.id] = new Set();
        });

        activities.forEach(activity => {
          const metadata = activity.metadata as Record<string, unknown>;
          const stepId = metadata?.step as string;
          if (stepId && stepCounts[stepId]) {
            stepCounts[stepId].add(activity.user_id);
          }
          
          // Also check event_name for completion
          if (activity.event_name === 'onboarding_completed') {
            stepCounts['complete'].add(activity.user_id);
          }
        });

        // Get total users who started onboarding (visited splash or first screen)
        const totalStarted = Math.max(
          stepCounts['splash'].size,
          stepCounts['name'].size,
          1 // Minimum 1 to avoid division by zero
        );

        const funnelData: FunnelStep[] = ONBOARDING_STEPS.map((step, index) => {
          const count = stepCounts[step.id].size;
          const percentage = (count / totalStarted) * 100;
          const prevCount = index > 0 ? stepCounts[ONBOARDING_STEPS[index - 1].id].size : totalStarted;
          const dropoff = prevCount > 0 ? ((prevCount - count) / prevCount) * 100 : 0;

          return {
            step: step.label,
            count,
            percentage,
            dropoff: index === 0 ? 0 : dropoff
          };
        });

        setData(funnelData);
      } catch (error) {
        console.error('Error fetching funnel data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFunnelData();
  }, []);

  if (isLoading) {
    return (
      <Card className="h-[300px] animate-pulse">
        <CardContent className="p-4 h-full">
          <div className="h-full bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  if (data.every(d => d.count === 0)) {
    return (
      <Card className="h-[300px]">
        <CardContent className="p-8 h-full flex items-center justify-center text-muted-foreground text-center">
          No onboarding data yet. Data will appear as users go through onboarding.
        </CardContent>
      </Card>
    );
  }

  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <Card className="h-[300px]">
      <CardContent className="p-4 h-full overflow-y-auto">
        <div className="space-y-2">
          {data.map((step, index) => (
            <div key={step.step} className="flex items-center gap-3">
              {/* Step number */}
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                {index + 1}
              </div>
              
              {/* Step label and bar */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-foreground">{step.step}</span>
                  <span className="text-xs text-muted-foreground">
                    {step.count} ({step.percentage.toFixed(0)}%)
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${(step.count / maxCount) * 100}%` }}
                  />
                </div>
              </div>

              {/* Dropoff indicator */}
              {step.dropoff > 0 && (
                <div className="w-12 text-right">
                  <span className="text-xs text-red-500">-{step.dropoff.toFixed(0)}%</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
