import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const useExecutiveBoardAccess = () => {
  const { user } = useAuth();
  const [canAccessAdminModules, setCanAccessAdminModules] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkAccess = useCallback(async () => {
    if (!user) {
      setCanAccessAdminModules(false);
      setLoading(false);
      return;
    }

    try {
      // Call the database function to check access
      const { data, error } = await supabase.rpc('current_user_can_access_admin_modules');
      
      if (error) {
        console.error('Error checking admin module access:', error);
        setCanAccessAdminModules(false);
      } else {
        setCanAccessAdminModules(data || false);
      }
    } catch (error) {
      console.error('Error checking admin module access:', error);
      setCanAccessAdminModules(false);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

  const checkFunctionAccess = useCallback(async (functionName: string, permissionType: 'can_access' | 'can_manage' = 'can_access') => {
    if (!user) return false;

    // Config-based system - if user has admin access, they have function access
    return canAccessAdminModules;
  }, [user, canAccessAdminModules]);

  return {
    canAccessAdminModules,
    loading,
    checkFunctionAccess,
    refreshAccess: checkAccess
  };
};