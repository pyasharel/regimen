import { useState } from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

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
    alert('Preview mode reset!');
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
        <h2 className="text-xl font-semibold">Test Scenarios</h2>
        <div className="space-y-2 text-sm">
          <p>✅ No subscription + 0 compounds = Should allow adding first compound</p>
          <p>✅ No subscription + 1 compound = Should block adding second compound</p>
          <p>✅ No subscription + try edit = Should block editing</p>
          <p>✅ Active subscription = Should allow unlimited compounds</p>
          <p>✅ Trial active = Should allow unlimited compounds</p>
          <p>✅ Dismiss paywall = Should show preview mode banner</p>
          <p>✅ Preview mode 2 minutes = Should show paywall again</p>
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
            <span>EditCompoundScreen blocks all non-subscribers</span>
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
