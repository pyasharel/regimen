import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface PaywallContextType {
  isPaywallOpen: boolean;
  openPaywall: () => void;
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

  const openPaywall = useCallback(() => setIsPaywallOpen(true), []);
  const closePaywall = useCallback(() => setIsPaywallOpen(false), []);
  const setPaywallOpen = useCallback((open: boolean) => setIsPaywallOpen(open), []);

  return (
    <PaywallContext.Provider value={{ isPaywallOpen, openPaywall, closePaywall, setPaywallOpen }}>
      {children}
    </PaywallContext.Provider>
  );
};
