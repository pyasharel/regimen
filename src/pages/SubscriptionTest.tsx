import { useState, useEffect } from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RefreshCw, Copy, ChevronDown, ChevronUp } from 'lucide-react';

interface DebugData {
  timestamp: string;
  edgeFunctionResponse: any;
  profileData: any;
  contextState: any;
  error?: string;
}

export const SubscriptionTest = () => {
  const { 
    isSubscribed, 
    subscriptionStatus, 
    subscriptionType,
    subscriptionEndDate,
    trialEndDate,
    canAddCompound,
    refreshSubscription 
  } = useSubscription();
  
  const [canAdd, setCanAdd] = useState<boolean | null>(null);
  const [compoundCount, setCompoundCount] = useState<number | null>(null);
  const [debugData, setDebugData] = useState<DebugData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    edge: true,
    profile: true,
    context: true,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const fetchDebugData = async () => {
    setIsLoading(true);
    const timestamp = new Date().toISOString();
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setDebugData({
          timestamp,
          edgeFunctionResponse: null,
          profileData: null,
          contextState: null,
          error: 'Not authenticated'
        });
        setIsLoading(false);
        return;
      }

      // Fetch raw edge function response
      const edgeStart = Date.now();
      const { data: edgeData, error: edgeError } = await supabase.functions.invoke('check-subscription', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      const edgeDuration = Date.now() - edgeStart;

      // Fetch raw profile data
      const profileStart = Date.now();
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single();
      const profileDuration = Date.now() - profileStart;

      setDebugData({
        timestamp,
        edgeFunctionResponse: {
          data: edgeData,
          error: edgeError?.message,
          durationMs: edgeDuration,
        },
        profileData: {
          data: profileData,
          error: profileError?.message,
          durationMs: profileDuration,
        },
        contextState: {
          isSubscribed,
          subscriptionStatus,
          subscriptionType,
          subscriptionEndDate,
          trialEndDate,
        },
      });
    } catch (err: any) {
      setDebugData({
        timestamp,
        edgeFunctionResponse: null,
        profileData: null,
        contextState: null,
        error: err.message,
      });
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    fetchDebugData();
  }, [isSubscribed, subscriptionStatus]);

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

    await refreshSubscription('preview_reset');
    toast.success('Preview mode reset!');
  };

  const handleManageSubscription = async () => {
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

  const handleStartSubscription = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Not authenticated');
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { plan: 'annual', promoCode: '' }
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

  const copyDebugData = () => {
    if (debugData) {
      navigator.clipboard.writeText(JSON.stringify(debugData, null, 2));
      toast.success('Debug data copied to clipboard');
    }
  };

  const JsonBlock = ({ data, title, expanded, onToggle }: { data: any; title: string; expanded: boolean; onToggle: () => void }) => (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 bg-muted/50 hover:bg-muted transition-colors"
      >
        <span className="font-medium text-sm">{title}</span>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {expanded && (
        <pre className="p-3 text-xs overflow-auto max-h-64 bg-background">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );

  return (
    <div className="container mx-auto p-4 pb-24 space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Subscription Debug</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={copyDebugData} disabled={!debugData}>
            <Copy className="h-4 w-4 mr-1" />
            Copy
          </Button>
          <Button size="sm" onClick={fetchDebugData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Current Status Summary */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-3">Current Status</h2>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>Subscribed:</div>
          <div className={`font-mono ${isSubscribed ? 'text-green-500' : 'text-red-500'}`}>
            {isSubscribed ? 'Yes' : 'No'}
          </div>
          <div>Status:</div>
          <div className="font-mono">{subscriptionStatus}</div>
          <div>Type:</div>
          <div className="font-mono">{subscriptionType || 'None'}</div>
          <div>End Date:</div>
          <div className="font-mono text-xs">{subscriptionEndDate || 'None'}</div>
          <div>Trial End:</div>
          <div className="font-mono text-xs">{trialEndDate || 'None'}</div>
          <div>Can Add:</div>
          <div className="font-mono">{canAdd !== null ? (canAdd ? 'Yes' : 'No') : '—'}</div>
          <div>Compounds:</div>
          <div className="font-mono">{compoundCount !== null ? compoundCount : '—'}</div>
        </div>
        <div className="flex gap-2 mt-4 flex-wrap">
          <Button size="sm" variant="outline" onClick={checkAddPermission}>Check Can Add</Button>
          <Button size="sm" variant="outline" onClick={getCompoundCount}>Count Compounds</Button>
          <Button size="sm" variant="outline" onClick={() => refreshSubscription('subscription_test')}>Refresh Context</Button>
        </div>
      </Card>

      {/* Debug Data */}
      {debugData && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Raw Debug Data</h2>
            <span className="text-xs text-muted-foreground font-mono">
              {new Date(debugData.timestamp).toLocaleTimeString()}
            </span>
          </div>
          
          {debugData.error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
              Error: {debugData.error}
            </div>
          )}

          <JsonBlock
            title={`Edge Function Response (${debugData.edgeFunctionResponse?.durationMs || 0}ms)`}
            data={debugData.edgeFunctionResponse}
            expanded={expandedSections.edge}
            onToggle={() => toggleSection('edge')}
          />

          <JsonBlock
            title={`Profile Data (${debugData.profileData?.durationMs || 0}ms)`}
            data={debugData.profileData}
            expanded={expandedSections.profile}
            onToggle={() => toggleSection('profile')}
          />

          <JsonBlock
            title="Context State"
            data={debugData.contextState}
            expanded={expandedSections.context}
            onToggle={() => toggleSection('context')}
          />
        </Card>
      )}

      {/* Actions */}
      <Card className="p-4 space-y-3">
        <h2 className="text-lg font-semibold">Actions</h2>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={handleManageSubscription}>
            Manage Subscription
          </Button>
          <Button size="sm" onClick={handleStartSubscription}>
            Start Subscription
          </Button>
          <Button size="sm" variant="destructive" onClick={resetPreviewMode}>
            Reset Preview Mode
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Opens Stripe Portal/Checkout in new tab.
        </p>
      </Card>

      {/* Test Scenarios Reference */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-2">Expected Behavior</h2>
        <div className="space-y-2 text-xs">
          <div>
            <span className="font-semibold text-orange-500">Preview Mode:</span>
            <span className="ml-2">1 compound, 2-min timer, then paywall</span>
          </div>
          <div>
            <span className="font-semibold text-green-500">Trialing/Active:</span>
            <span className="ml-2">Unlimited compounds, all features</span>
          </div>
          <div>
            <span className="font-semibold text-yellow-500">Past Due:</span>
            <span className="ml-2">Limited access, payment banner</span>
          </div>
        </div>
      </Card>
    </div>
  );
};
