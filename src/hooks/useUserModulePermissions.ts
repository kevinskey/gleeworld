import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UserModulePermission {
  id: string;
  user_id: string;
  module_id: string;
  granted_by: string;
  granted_at: string;
  revoked_at?: string;
  is_active: boolean;
  notes?: string;
}

export interface UserWithPermissions {
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  is_exec_board: boolean;
  modules: string[];
}

export const useUserModulePermissions = () => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<UserModulePermission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPermissions = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('user_module_permissions')
        .select('*')
        .eq('is_active', true)
        .order('granted_at', { ascending: false });
      
      if (error) throw error;
      setPermissions(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch permissions';
      setError(errorMessage);
      console.error('Error fetching user module permissions:', err);
    } finally {
      setLoading(false);
    }
  };

  const getUserPermissions = async (userId: string): Promise<string[]> => {
    try {
      const { data, error } = await supabase
        .from('user_module_permissions')
        .select('module_id')
        .eq('user_id', userId)
        .eq('is_active', true);
      
      if (error) throw error;
      return data?.map(p => p.module_id) || [];
    } catch (err) {
      console.error('Error fetching user permissions:', err);
      return [];
    }
  };

  const grantModuleAccess = async (userId: string, moduleId: string, notes?: string): Promise<boolean> => {
    if (!user) return false;
    
    try {
      // First, check if permission already exists (active or inactive)
      const { data: existing } = await supabase
        .from('user_module_permissions')
        .select('id, is_active')
        .eq('user_id', userId)
        .eq('module_id', moduleId)
        .maybeSingle();

      if (existing) {
        if (existing.is_active) {
          // Already has active permission
          return true;
        } else {
          // Reactivate existing permission
          const { error } = await supabase
            .from('user_module_permissions')
            .update({
              is_active: true,
              revoked_at: null,
              granted_by: user.id,
              granted_at: new Date().toISOString(),
              notes: notes || null
            })
            .eq('id', existing.id);
          
          if (error) throw error;
        }
      } else {
        // Create new permission
        const { error } = await supabase
          .from('user_module_permissions')
          .insert({
            user_id: userId,
            module_id: moduleId,
            granted_by: user.id,
            notes: notes || null
          });
        
        if (error) throw error;
      }
      
      await fetchPermissions();
      return true;
    } catch (err) {
      console.error('Error granting module access:', err);
      setError(err instanceof Error ? err.message : 'Failed to grant access');
      return false;
    }
  };

  const revokeModuleAccess = async (userId: string, moduleId: string): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const { error } = await supabase
        .from('user_module_permissions')
        .update({
          is_active: false,
          revoked_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('module_id', moduleId)
        .eq('is_active', true);
      
      if (error) throw error;
      
      await fetchPermissions();
      return true;
    } catch (err) {
      console.error('Error revoking module access:', err);
      setError(err instanceof Error ? err.message : 'Failed to revoke access');
      return false;
    }
  };

  const getAllUsersWithPermissions = async (): Promise<UserWithPermissions[]> => {
    try {
      // Get all users
      const { data: users, error: usersError } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, email, role, is_exec_board')
        .order('full_name');
      
      if (usersError) throw usersError;
      
      // Get all active permissions
      const { data: perms, error: permsError } = await supabase
        .from('user_module_permissions')
        .select('user_id, module_id')
        .eq('is_active', true);
      
      if (permsError) throw permsError;
      
      // Combine users with their permissions
      const usersWithPermissions: UserWithPermissions[] = (users || []).map(user => ({
        user_id: user.user_id,
        full_name: user.full_name || user.email || 'Unknown User',
        email: user.email || '',
        role: user.role || 'member',
        is_exec_board: user.is_exec_board || false,
        modules: (perms || [])
          .filter(p => p.user_id === user.user_id)
          .map(p => p.module_id)
      }));
      
      return usersWithPermissions;
    } catch (err) {
      console.error('Error fetching users with permissions:', err);
      return [];
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, [user]);

  return {
    permissions,
    loading,
    error,
    getUserPermissions,
    grantModuleAccess,
    revokeModuleAccess,
    getAllUsersWithPermissions,
    refetch: fetchPermissions
  };
};