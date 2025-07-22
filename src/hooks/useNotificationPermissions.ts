import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useNotificationPermissions() {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    async function fetchPermissions() {
      if (!user?.email) {
        setPermissions([]);
        setIsLoading(false);
        return;
      }

      try {
        // Check if user is super admin
        const { data: profile } = await supabase
          .from('gw_profiles')
          .select('is_super_admin, is_admin')
          .eq('user_id', user.id)
          .single();

        console.log('User profile:', profile);

        if (profile?.is_super_admin) {
          console.log('User is super admin - granting all permissions');
          setIsSuperAdmin(true);
          setPermissions(['mass-email', 'sms', 'communications', 'newsletter', 'public-forms', 'integrations']);
          setIsLoading(false);
          return;
        }

        // Get user permissions from username_permissions table
        const { data: userPermissions, error } = await supabase
          .from('username_permissions')
          .select('module_name')
          .eq('user_email', user.email)
          .eq('is_active', true)
          .or('expires_at.is.null,expires_at.gt.now()');

        console.log('User permissions query:', { userPermissions, error, email: user.email });

        const moduleNames = userPermissions?.map(p => p.module_name) || [];
        console.log('Final permissions:', moduleNames);
        setPermissions(moduleNames);
      } catch (error) {
        console.error('Error fetching permissions:', error);
        setPermissions([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPermissions();
  }, [user]);

  const hasPermission = (module: string) => {
    return isSuperAdmin || permissions.includes(module);
  };

  return {
    permissions,
    hasPermission,
    isLoading,
    isSuperAdmin
  };
}