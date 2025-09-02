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

// Enhanced hook for checking specific module permissions using the new functions
export const useSpecificModulePermissions = (moduleName: string) => {
  const { user } = useAuth();
  const [canAccess, setCanAccess] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkPermissions();
  }, [user, moduleName]);

  const checkPermissions = async () => {
    if (!user) {
      setCanAccess(false);
      setCanManage(false);
      setLoading(false);
      return;
    }

    try {
      // Check if user has access to the module
      const { data: accessData, error: accessError } = await supabase
        .rpc('current_user_has_executive_function_access', {
          function_name_param: moduleName,
          permission_type_param: 'can_access'
        });

      // Check if user can manage the module
      const { data: manageData, error: manageError } = await supabase
        .rpc('current_user_has_executive_function_access', {
          function_name_param: moduleName,
          permission_type_param: 'can_manage'
        });

      if (accessError || manageError) {
        console.error('Permission check failed:', accessError || manageError);
      }

      setCanAccess(accessData || false);
      setCanManage(manageData || false);
    } catch (error) {
      console.error('Error checking permissions:', error);
      setCanAccess(false);
      setCanManage(false);
    } finally {
      setLoading(false);
    }
  };

  return { canAccess, canManage, loading };
};

// Helper function to check if user has admin access
export const useAdminAccess = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdminAccess();
  }, [user]);

  const checkAdminAccess = async () => {
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .rpc('current_user_can_access_admin_modules');

      if (!error) {
        setIsAdmin(data || false);
      }
    } catch (error) {
      console.error('Error checking admin access:', error);
    } finally {
      setLoading(false);
    }
  };

  return { isAdmin, loading };
};