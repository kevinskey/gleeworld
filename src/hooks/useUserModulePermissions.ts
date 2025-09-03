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
        .from('gw_user_module_permissions')
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
        .from('gw_user_module_permissions')
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
        .from('gw_user_module_permissions')
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
            .from('gw_user_module_permissions')
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
          .from('gw_user_module_permissions')
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
        .from('gw_user_module_permissions')
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
      console.log('🔍 getAllUsersWithPermissions: Starting fetch...');
      
      // Get all users using the same query pattern as the working useUsers hook
      const { data: users, error: usersError } = await supabase
        .from('gw_profiles')
        .select(`
          id, user_id, email, full_name, first_name, last_name, role,
          exec_board_role, is_exec_board, avatar_url, phone, voice_part, 
          class_year, join_date, status, dues_paid, notes, is_admin, 
          is_super_admin, title, bio, graduation_year, verified, created_at
        `)
        .order('created_at', { ascending: false });
      
      console.log('🔍 getAllUsersWithPermissions: Raw gw_profiles data:', {
        count: users?.length || 0,
        error: usersError,
        sampleUsers: users?.slice(0, 5).map(u => ({ name: u.full_name, email: u.email })),
        arianaInResults: users?.find(u => u.email === 'arianaswindell@spelman.edu')
      });
      
      if (usersError) {
        console.error('🔍 getAllUsersWithPermissions: Error fetching users:', usersError);
        throw usersError;
      }
      
      // Get all active permissions
      console.log('🔍 getAllUsersWithPermissions: Fetching permissions...');
      const { data: perms, error: permsError } = await supabase
        .from('gw_user_module_permissions')
        .select('user_id, module_id')
        .eq('is_active', true);
      
      console.log('🔍 getAllUsersWithPermissions: Permissions data:', {
        count: perms?.length || 0,
        error: permsError,
        arianaPerms: perms?.filter(p => {
          const user = users?.find(u => u.user_id === p.user_id);
          return user?.email === 'arianaswindell@spelman.edu';
        })
      });
      
      if (permsError) {
        console.error('🔍 getAllUsersWithPermissions: Error fetching permissions:', permsError);
        throw permsError;
      }
      
      // Combine users with their permissions, filtering out invalid entries like useUsers does
      const usersWithPermissions: UserWithPermissions[] = (users || [])
        .filter(profile => profile.user_id) // Only include profiles with valid user_id
        .map(profile => {
          // Build full_name like useUsers does
          const fullName = profile.full_name || 
                          (profile.first_name && profile.last_name ? 
                           `${profile.first_name} ${profile.last_name}` : null) ||
                          profile.email || 'Unknown User';
          
          const userPermissions = (perms || [])
            .filter(p => p.user_id === profile.user_id)
            .map(p => p.module_id);
                           
          return {
            user_id: profile.user_id,
            full_name: fullName,
            email: profile.email || '',
            role: profile.role || 'member',
            is_exec_board: profile.is_exec_board || false,
            modules: userPermissions
          };
        });
      
      console.log('🔍 getAllUsersWithPermissions: Final users with permissions:', {
        count: usersWithPermissions.length,
        arianaFound: usersWithPermissions.find(u => u.email === 'arianaswindell@spelman.edu'),
        sampleUsersWithModules: usersWithPermissions.slice(0, 3).map(u => ({
          name: u.full_name,
          email: u.email,
          moduleCount: u.modules.length,
          modules: u.modules.slice(0, 3)
        }))
      });
      
      return usersWithPermissions;
    } catch (err) {
      console.error('🔍 getAllUsersWithPermissions: Catch block error:', err);
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