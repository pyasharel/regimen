import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { TestTube2 } from 'lucide-react';

type MockState = 'none' | 'preview' | 'trialing' | 'active' | 'past_due' | 'canceled';

interface DevSubscriptionToggleProps {
  onMockStateChange: (state: MockState) => void;
}

export const DevSubscriptionToggle = ({ onMockStateChange }: DevSubscriptionToggleProps) => {
  const [mockState, setMockState] = useState<MockState>('none');
  const [isOpen, setIsOpen] = useState(false);

  // Only show in development
  const isDev = import.meta.env.DEV;
  
  if (!isDev) return null;

  const states: { value: MockState; label: string; description: string }[] = [
    { value: 'none', label: 'Real Data', description: 'Uses your actual Stripe subscription status' },
    { value: 'preview', label: 'Preview Mode', description: 'No subscription - shows upgrade prompts' },
    { value: 'trialing', label: 'Free Trial', description: 'Active trial period' },
    { value: 'active', label: 'Active Subscription', description: 'Paid subscription active' },
    { value: 'past_due', label: 'Payment Failed', description: 'Subscription past due - shows payment prompt' },
    { value: 'canceled', label: 'Canceled (Grace Period)', description: 'Canceled but still has access until period ends' },
  ];

  const handleStateChange = (state: MockState) => {
    setMockState(state);
    onMockStateChange(state);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="fixed bottom-24 right-4 z-50 shadow-lg bg-background/95 backdrop-blur"
        >
          <TestTube2 className="h-4 w-4 mr-2" />
          Dev
          {mockState !== 'none' && (
            <Badge variant="secondary" className="ml-2 text-xs">
              Mock
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      
      <SheetContent side="bottom" className="h-[80vh] flex flex-col">
        <SheetHeader>
          <SheetTitle>Developer: Subscription State Preview</SheetTitle>
        </SheetHeader>
        
        <div className="mt-6 space-y-3 overflow-y-auto flex-1 pr-2">
          {states.map((state) => (
            <button
              key={state.value}
              onClick={() => handleStateChange(state.value)}
              className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                mockState === state.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card hover:border-primary/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">{state.label}</p>
                  <p className="text-sm text-muted-foreground mt-1">{state.description}</p>
                </div>
                {mockState === state.value && (
                  <div className="w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-primary" />
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground">
            This panel is only visible in development mode. Select a state to preview different subscription banners and UI states.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
};
