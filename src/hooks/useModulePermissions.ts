import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ModulePermission {
  id: string;
  module_name: string;
  permission_type: string;
  granted_at: string;
  expires_at?: string;
  is_active: boolean;
}

export const useModulePermissions = () => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<ModulePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPermissions = async () => {
    if (!user) {
      setPermissions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('gw_module_permissions')
        .select(`
          id,
          permission_type,
          granted_at,
          expires_at,
          is_active,
          gw_modules!inner(name)
        `)
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (error) throw error;

      const formattedPermissions = data?.map(item => ({
        id: item.id,
        module_name: (item.gw_modules as any).name,
        permission_type: item.permission_type,
        granted_at: item.granted_at,
        expires_at: item.expires_at,
        is_active: item.is_active
      })) || [];

      setPermissions(formattedPermissions);
      setError(null);
    } catch (err) {
      console.error('Error fetching module permissions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch permissions');
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (moduleName: string, permissionType: string = 'view') => {
    return permissions.some(perm => 
      perm.module_name === moduleName && 
      perm.permission_type === permissionType &&
      perm.is_active &&
      (!perm.expires_at || new Date(perm.expires_at) > new Date())
    );
  };

  const getModulePermissions = (moduleName: string) => {
    return permissions
      .filter(perm => 
        perm.module_name === moduleName &&
        perm.is_active &&
        (!perm.expires_at || new Date(perm.expires_at) > new Date())
      )
      .map(perm => perm.permission_type);
  };

  useEffect(() => {
    fetchPermissions();
  }, [user]);

  return {
    permissions,
    loading,
    error,
    hasPermission,
    getModulePermissions,
    refetch: fetchPermissions
  };
};