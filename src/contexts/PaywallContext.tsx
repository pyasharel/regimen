import { createContext, useContext, useState, ReactNode, useCallback, useRef } from 'react';

interface PaywallPayload {
  message?: string;
  onDismiss?: () => void;
}

interface PaywallContextType {
  isPaywallOpen: boolean;
  paywallMessage: string | undefined;
  openPaywall: (payload?: PaywallPayload) => void;
  closePaywall: () => void;
  setPaywallOpen: (open: boolean) => void;
}

const PaywallContext = createContext<PaywallContextType | undefined>(undefined);

export const usePaywall = () => {
  const context = useContext(PaywallContext);
  if (!context) {
    throw new Error('usePaywall must be used within PaywallProvider');
  }
  return context;
};

export const PaywallProvider = ({ children }: { children: ReactNode }) => {
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [paywallMessage, setPaywallMessage] = useState<string | undefined>(undefined);
  const onDismissRef = useRef<(() => void) | undefined>(undefined);

  const openPaywall = useCallback((payload?: PaywallPayload) => {
    setPaywallMessage(payload?.message);
    onDismissRef.current = payload?.onDismiss;
    setIsPaywallOpen(true);
  }, []);

  const closePaywall = useCallback(() => {
    setIsPaywallOpen(false);
    // Call onDismiss callback if provided
    if (onDismissRef.current) {
      onDismissRef.current();
      onDismissRef.current = undefined;
    }
    setPaywallMessage(undefined);
  }, []);

  const setPaywallOpen = useCallback((open: boolean) => {
    if (!open) {
      closePaywall();
    } else {
      setIsPaywallOpen(true);
    }
  }, [closePaywall]);

  return (
    <PaywallContext.Provider value={{ 
      isPaywallOpen, 
      paywallMessage,
      openPaywall, 
      closePaywall, 
      setPaywallOpen 
    }}>
      {children}
    </PaywallContext.Provider>
  );
};
