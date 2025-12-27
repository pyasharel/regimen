import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy, RefreshCw, Trash2 } from 'lucide-react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';

interface DiagnosticsLog {
  timestamp: string;
  source: string;
  prevStatus: string;
  newStatus: string;
  details?: string;
}

// Global diagnostic logs stored in memory
const MAX_LOGS = 50;
let diagnosticsLogs: DiagnosticsLog[] = [];

export const addDiagnosticsLog = (
  source: string,
  prevStatus: string,
  newStatus: string,
  details?: string
) => {
  const log: DiagnosticsLog = {
    timestamp: new Date().toISOString(),
    source,
    prevStatus,
    newStatus,
    details,
  };
  diagnosticsLogs = [log, ...diagnosticsLogs].slice(0, MAX_LOGS);
  console.log('[DIAG]', log);
};

export const getDiagnosticsLogs = () => diagnosticsLogs;
export const clearDiagnosticsLogs = () => { diagnosticsLogs = []; };

interface SubscriptionDiagnosticsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SubscriptionDiagnostics = ({ open, onOpenChange }: SubscriptionDiagnosticsProps) => {
  const {
    isSubscribed,
    subscriptionStatus,
    subscriptionType,
    subscriptionEndDate,
    trialEndDate,
    isNativePlatform,
    subscriptionProvider,
    refreshSubscription,
    isLoading,
  } = useSubscription();

  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [logs, setLogs] = useState<DiagnosticsLog[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (open) {
      loadUserInfo();
      setLogs([...getDiagnosticsLogs()]);
    }
  }, [open]);

  const loadUserInfo = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      setUserEmail(user.email || null);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    addDiagnosticsLog('manual_refresh', subscriptionStatus, '...', 'User triggered manual refresh');
    await refreshSubscription();
    setLogs([...getDiagnosticsLogs()]);
    setRefreshing(false);
  };

  const handleClearLogs = () => {
    clearDiagnosticsLogs();
    setLogs([]);
    toast.success('Logs cleared');
  };

  const handleCopyDiagnostics = () => {
    const diagnosticData = {
      platform: Capacitor.getPlatform(),
      isNative: isNativePlatform,
      userId,
      userEmail,
      subscriptionStatus,
      subscriptionType,
      subscriptionProvider,
      isSubscribed,
      subscriptionEndDate,
      trialEndDate,
      isLoading,
      logs: logs.slice(0, 20),
      timestamp: new Date().toISOString(),
    };
    navigator.clipboard.writeText(JSON.stringify(diagnosticData, null, 2));
    toast.success('Diagnostics copied to clipboard');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'trialing':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'past_due':
      case 'canceled':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'none':
      case 'preview':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            🔧 Subscription Diagnostics
          </DialogTitle>
          <DialogDescription>
            Debug subscription state and transitions
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4">
            {/* Current State */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Current State</h3>
              <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Platform:</span>
                  <span>{Capacitor.getPlatform()} {isNativePlatform ? '(native)' : '(web)'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">User ID:</span>
                  <span className="truncate max-w-[180px]">{userId || 'null'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant="outline" className={getStatusColor(subscriptionStatus)}>
                    {subscriptionStatus}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">isSubscribed:</span>
                  <span className={isSubscribed ? 'text-green-400' : 'text-red-400'}>
                    {String(isSubscribed)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <span>{subscriptionType || 'null'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Provider:</span>
                  <span>{subscriptionProvider || 'null'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">End Date:</span>
                  <span className="truncate max-w-[150px]">
                    {subscriptionEndDate ? new Date(subscriptionEndDate).toLocaleDateString() : 'null'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Trial End:</span>
                  <span className="truncate max-w-[150px]">
                    {trialEndDate ? new Date(trialEndDate).toLocaleDateString() : 'null'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">isLoading:</span>
                  <span>{String(isLoading)}</span>
                </div>
              </div>
            </div>

            {/* State Transition Logs */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">State Transitions</h3>
                <span className="text-xs text-muted-foreground">{logs.length} entries</span>
              </div>
              
              {logs.length === 0 ? (
                <div className="bg-muted/30 rounded-lg p-4 text-center text-sm text-muted-foreground">
                  No state transitions logged yet
                </div>
              ) : (
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {logs.map((log, index) => (
                    <div
                      key={index}
                      className="bg-muted/30 rounded-lg p-2 text-xs font-mono space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {log.source}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className={getStatusColor(log.prevStatus)}>
                          {log.prevStatus}
                        </Badge>
                        <span className="text-muted-foreground">→</span>
                        <Badge variant="outline" className={getStatusColor(log.newStatus)}>
                          {log.newStatus}
                        </Badge>
                      </div>
                      {log.details && (
                        <div className="text-[10px] text-muted-foreground truncate">
                          {log.details}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleCopyDiagnostics}
          >
            <Copy className="h-3.5 w-3.5 mr-1.5" />
            Copy
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearLogs}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
