import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface AdminRouteProps {
  children: React.ReactNode;
}

/**
 * AdminRoute - Protects routes that should only be accessible to admin users.
 * Uses the user_roles table with the has_role() function to check admin status.
 */
export function AdminRoute({ children }: AdminRouteProps) {
  const { data: isAdmin, isLoading } = useQuery({
    queryKey: ['admin-check'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      
      // Check if user has admin role using the existing has_role function
      const { data: hasAdminRole, error } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });
      
      if (error) {
        console.error('[ADMIN-ROUTE] Error checking admin role:', error);
        return false;
      }
      
      return hasAdminRole === true;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: false,
  });
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (!isAdmin) {
    return <Navigate to="/today" replace />;
  }
  
  return <>{children}</>;
}
