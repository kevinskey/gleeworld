// Module permission management hook for admin interfaces
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useModulePermissionManager() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Set user module override (username-based permissions)
  const setUserModuleOverride = async (
    userId: string,
    moduleKey: string,
    patch: { can_view?: boolean; can_manage?: boolean }
  ) => {
    try {
      setLoading(true);

      // First get the module ID
      const { data: module, error: moduleError } = await supabase
        .from('gw_modules')
        .select('id')
        .eq('key', moduleKey)
        .single();

      if (moduleError || !module) {
        throw new Error(`Module '${moduleKey}' not found`);
      }

      // Upsert the permission
      const { error } = await supabase
        .from('username_module_permissions')
        .upsert({
          user_id: userId,
          module_id: module.id,
          can_view: patch.can_view ?? true,
          can_manage: patch.can_manage ?? false,
          source: 'admin-ui',
          is_active: true
        }, {
          onConflict: 'user_id,module_id'
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Module permission updated successfully',
      });

      return true;
    } catch (error) {
      console.error('Error setting user module override:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update permission',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Remove user module override
  const removeUserModuleOverride = async (userId: string, moduleKey: string) => {
    try {
      setLoading(true);

      // Get the module ID
      const { data: module, error: moduleError } = await supabase
        .from('gw_modules')
        .select('id')
        .eq('key', moduleKey)
        .single();

      if (moduleError || !module) {
        throw new Error(`Module '${moduleKey}' not found`);
      }

      // Delete the permission override
      const { error } = await supabase
        .from('username_module_permissions')
        .delete()
        .eq('user_id', userId)
        .eq('module_id', module.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Module permission override removed',
      });

      return true;
    } catch (error) {
      console.error('Error removing user module override:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to remove permission',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Set role-based module permissions
  const setRoleModulePermissions = async (
    roleKey: string,
    moduleKey: string,
    patch: { can_view?: boolean; can_manage?: boolean }
  ) => {
    try {
      setLoading(true);

      // Get role and module IDs
      const [roleResult, moduleResult] = await Promise.all([
        supabase.from('gw_roles').select('id').eq('key', roleKey).single(),
        supabase.from('gw_modules').select('id').eq('key', moduleKey).single()
      ]);

      if (roleResult.error || !roleResult.data) {
        throw new Error(`Role '${roleKey}' not found`);
      }
      if (moduleResult.error || !moduleResult.data) {
        throw new Error(`Module '${moduleKey}' not found`);
      }

      // Upsert the role permission
      const { error } = await supabase
        .from('gw_role_module_permissions')
        .upsert({
          role_id: roleResult.data.id,
          module_id: moduleResult.data.id,
          can_view: patch.can_view ?? true,
          can_manage: patch.can_manage ?? false
        }, {
          onConflict: 'role_id,module_id'
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Role module permission updated successfully',
      });

      return true;
    } catch (error) {
      console.error('Error setting role module permissions:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update role permission',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    setUserModuleOverride,
    removeUserModuleOverride,
    setRoleModulePermissions
  };
}