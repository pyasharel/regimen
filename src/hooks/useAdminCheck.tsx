import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useAdminCheck = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          console.log('[AdminCheck] No user logged in');
          setIsAdmin(false);
          setIsLoading(false);
          return;
        }

        console.log('[AdminCheck] Checking admin status for user:', user.id);

        // Query the user_roles table directly
        // The RLS policy on user_roles allows admins to read
        // But since we need to check if the current user is admin, we use a workaround:
        // The has_role function is SECURITY DEFINER, so we call it via RPC
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();

        console.log('[AdminCheck] Query result:', { data, error });

        if (error) {
          console.error('[AdminCheck] Error checking admin status:', error);
          // Fallback: try RPC call
          try {
            const rpcResult = await (supabase.rpc as any)('has_role', {
              _user_id: user.id,
              _role: 'admin'
            });
            console.log('[AdminCheck] RPC fallback result:', rpcResult);
            setIsAdmin(rpcResult.data === true);
          } catch (rpcError) {
            console.error('[AdminCheck] RPC fallback failed:', rpcError);
            setIsAdmin(false);
          }
        } else {
          const adminResult = data !== null;
          console.log('[AdminCheck] Is admin:', adminResult);
          setIsAdmin(adminResult);
        }
      } catch (error) {
        console.error('[AdminCheck] Exception:', error);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminStatus();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkAdminStatus();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { isAdmin, isLoading };
};
