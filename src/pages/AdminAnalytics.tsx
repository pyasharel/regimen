import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { OverviewCards } from '@/components/admin/OverviewCards';
import { UserGrowthChart } from '@/components/admin/UserGrowthChart';
import { FeatureUsageTable } from '@/components/admin/FeatureUsageTable';
import { CohortRetention } from '@/components/admin/CohortRetention';
import { UserList } from '@/components/admin/UserList';
import { OnboardingFunnel } from '@/components/admin/OnboardingFunnel';
import { Loader2, ShieldAlert } from 'lucide-react';

const AdminAnalytics = () => {
  const navigate = useNavigate();
  const { isAdmin, isLoading } = useAdminCheck();

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      // Don't redirect, just show access denied
    }
  }, [isAdmin, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-4">
        <ShieldAlert className="h-16 w-16 text-destructive" />
        <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
        <p className="text-muted-foreground text-center">
          You don't have permission to view this page.
        </p>
        <button 
          onClick={() => navigate('/today')}
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Monitor user engagement and app performance
          </p>
        </div>

        {/* Overview Cards */}
        <section className="mb-8">
          <OverviewCards />
        </section>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">User Growth</h2>
            <UserGrowthChart />
          </section>
          
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">Onboarding Funnel</h2>
            <OnboardingFunnel />
          </section>
        </div>

        {/* Feature Usage */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">Feature Usage</h2>
          <FeatureUsageTable />
        </section>

        {/* Cohort Retention */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">Cohort Retention</h2>
          <CohortRetention />
        </section>

        {/* User List */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">Users</h2>
          <UserList />
        </section>
      </div>
    </div>
  );
};

export default AdminAnalytics;
