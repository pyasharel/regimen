import { useState } from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const SubscriptionTest = () => {
  const { 
    isSubscribed, 
    subscriptionStatus, 
    subscriptionType,
    canAddCompound,
    refreshSubscription 
  } = useSubscription();
  
  const [canAdd, setCanAdd] = useState<boolean | null>(null);
  const [compoundCount, setCompoundCount] = useState<number | null>(null);

  const checkAddPermission = async () => {
    const allowed = await canAddCompound();
    setCanAdd(allowed);
  };

  const getCompoundCount = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { count } = await supabase
      .from('compounds')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    setCompoundCount(count || 0);
  };

  const resetPreviewMode = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('profiles')
      .update({ preview_mode_compound_added: false })
      .eq('user_id', user.id);

    await refreshSubscription();
    toast.success('Preview mode reset!');
  };

  const cancelSubscription = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Not authenticated');
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-portal-session', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
        toast.info('Manage subscription in Stripe Portal');
      }
    } catch (error) {
      console.error('Portal error:', error);
      toast.error('Failed to open portal');
    }
  };

  const startNewSubscription = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Not authenticated');
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
        toast.info('Complete checkout in new tab');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to create checkout');
    }
  };

  return (
    <div className="container mx-auto p-8 space-y-6">
      <h1 className="text-3xl font-bold">Subscription System Test</h1>

      <Card className="p-6 space-y-4">
        <h2 className="text-xl font-semibold">Current Status</h2>
        <div className="space-y-2">
          <p>Subscribed: <strong>{isSubscribed ? 'Yes' : 'No'}</strong></p>
          <p>Status: <strong>{subscriptionStatus}</strong></p>
          <p>Type: <strong>{subscriptionType || 'None'}</strong></p>
          <p>Can Add Compound: <strong>{canAdd !== null ? (canAdd ? 'Yes' : 'No') : 'Not checked'}</strong></p>
          <p>Compound Count: <strong>{compoundCount !== null ? compoundCount : 'Not checked'}</strong></p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button onClick={checkAddPermission}>Check Can Add</Button>
          <Button onClick={getCompoundCount}>Get Compound Count</Button>
          <Button onClick={refreshSubscription}>Refresh Status</Button>
          <Button onClick={resetPreviewMode} variant="destructive">Reset Preview Mode</Button>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-xl font-semibold">Real Stripe Controls</h2>
        <p className="text-sm text-muted-foreground">Manage your actual Stripe subscription</p>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={cancelSubscription} variant="outline">
            Manage/Cancel Subscription
          </Button>
          <Button onClick={startNewSubscription} variant="default">
            Start New Subscription
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Opens Stripe Portal/Checkout in new tab. Cancel subscription there to return to preview mode.
        </p>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-xl font-semibold">Test Scenarios</h2>
        <div className="space-y-2 text-sm">
          <p className="font-bold text-[#FF6F61]">Preview Mode (Non-Subscriber):</p>
          <p>✅ Should allow: Add 1 compound</p>
          <p>✅ Should allow: Edit that 1 compound freely</p>
          <p>✅ Should allow: View in calendar, dose calculations</p>
          <p>❌ Should block: Adding 2nd compound → Paywall</p>
          <p>❌ Should block: After 2 minutes → Paywall</p>
          
          <p className="font-bold text-[#8B5CF6] mt-4">Subscribed (Active or Trial):</p>
          <p>✅ Should allow: Unlimited compounds</p>
          <p>✅ Should allow: Edit any compound</p>
          <p>✅ Should allow: All premium features</p>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-xl font-semibold">Integration Checklist</h2>
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input type="checkbox" />
            <span>AddCompoundScreen blocks non-subscribers at 2nd compound</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" />
            <span>Preview users can edit their 1 compound</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" />
            <span>Preview mode banner shows for non-subscribers</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" />
            <span>2-minute timer triggers paywall</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" />
            <span>Paywall shows in onboarding</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" />
            <span>Old isPremium logic removed</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" />
            <span>Settings shows correct subscription state</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" />
            <span>Banners show for trial/past_due/canceled</span>
          </label>
        </div>
      </Card>
    </div>
  );
};
