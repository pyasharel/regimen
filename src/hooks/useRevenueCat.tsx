import { useEffect, useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Purchases, LOG_LEVEL, CustomerInfo, PurchasesOfferings } from '@revenuecat/purchases-capacitor';

// RevenueCat public API key (safe to include in client code)
const REVENUECAT_API_KEY = 'test_MKazSVVRceSDxsVenUBKbLhJxPJ';
const ENTITLEMENT_ID = 'Regimen Pro';

interface RevenueCatState {
  isConfigured: boolean;
  isPro: boolean;
  customerInfo: CustomerInfo | null;
  offerings: PurchasesOfferings | null;
  isLoading: boolean;
  error: string | null;
}

export const useRevenueCat = () => {
  const [state, setState] = useState<RevenueCatState>({
    isConfigured: false,
    isPro: false,
    customerInfo: null,
    offerings: null,
    isLoading: true,
    error: null,
  });

  // Initialize RevenueCat
  useEffect(() => {
    const initRevenueCat = async () => {
      const platform = Capacitor.getPlatform();
      
      // Only initialize on native platforms
      if (platform === 'web') {
        console.log('[RevenueCat] Web platform detected, skipping initialization');
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      try {
        console.log('[RevenueCat] Initializing on platform:', platform);
        
        await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
        await Purchases.configure({ apiKey: REVENUECAT_API_KEY });
        
        console.log('[RevenueCat] Configuration complete');
        
        // Get initial customer info
        const { customerInfo } = await Purchases.getCustomerInfo();
        const isPro = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
        
        console.log('[RevenueCat] Customer info loaded, isPro:', isPro);
        
        // Get offerings
        const offerings = await Purchases.getOfferings();
        console.log('[RevenueCat] Offerings loaded:', offerings);
        
        setState({
          isConfigured: true,
          isPro,
          customerInfo,
          offerings,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        console.error('[RevenueCat] Initialization error:', error);
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to initialize RevenueCat',
        }));
      }
    };

    initRevenueCat();
  }, []);

  // Purchase a package
  const purchasePackage = useCallback(async (packageToPurchase: any) => {
    try {
      console.log('[RevenueCat] Purchasing package:', packageToPurchase);
      const { customerInfo } = await Purchases.purchasePackage({ aPackage: packageToPurchase });
      
      const isPro = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
      
      setState(prev => ({
        ...prev,
        customerInfo,
        isPro,
      }));
      
      return { success: true, customerInfo };
    } catch (error: any) {
      console.error('[RevenueCat] Purchase error:', error);
      
      // Check if user cancelled
      if (error.code === 'PURCHASE_CANCELLED') {
        return { success: false, cancelled: true };
      }
      
      return { success: false, error: error.message || 'Purchase failed' };
    }
  }, []);

  // Restore purchases
  const restorePurchases = useCallback(async () => {
    try {
      console.log('[RevenueCat] Restoring purchases');
      const { customerInfo } = await Purchases.restorePurchases();
      
      const isPro = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
      
      setState(prev => ({
        ...prev,
        customerInfo,
        isPro,
      }));
      
      return { success: true, isPro };
    } catch (error) {
      console.error('[RevenueCat] Restore error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Restore failed' };
    }
  }, []);

  // Refresh customer info
  const refreshCustomerInfo = useCallback(async () => {
    try {
      const { customerInfo } = await Purchases.getCustomerInfo();
      const isPro = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
      
      setState(prev => ({
        ...prev,
        customerInfo,
        isPro,
      }));
      
      return { success: true, isPro };
    } catch (error) {
      console.error('[RevenueCat] Refresh error:', error);
      return { success: false };
    }
  }, []);

  // Identify user (call after login)
  const identifyUser = useCallback(async (userId: string) => {
    try {
      console.log('[RevenueCat] Identifying user:', userId);
      const { customerInfo } = await Purchases.logIn({ appUserID: userId });
      
      const isPro = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
      
      setState(prev => ({
        ...prev,
        customerInfo,
        isPro,
      }));
      
      return { success: true };
    } catch (error) {
      console.error('[RevenueCat] Identify error:', error);
      return { success: false };
    }
  }, []);

  // Logout (reset to anonymous)
  const logoutUser = useCallback(async () => {
    try {
      console.log('[RevenueCat] Logging out user');
      const { customerInfo } = await Purchases.logOut();
      
      setState(prev => ({
        ...prev,
        customerInfo,
        isPro: false,
      }));
      
      return { success: true };
    } catch (error) {
      console.error('[RevenueCat] Logout error:', error);
      return { success: false };
    }
  }, []);

  return {
    ...state,
    purchasePackage,
    restorePurchases,
    refreshCustomerInfo,
    identifyUser,
    logoutUser,
  };
};
