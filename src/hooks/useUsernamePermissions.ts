import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface UsernamePermission {
  id: string;
  user_email: string;
  module_name: string;
  granted_by: string | null;
  granted_at: string;
  expires_at: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserPermissionSummary {
  module_name: string;
  granted_at: string;
  expires_at: string | null;
  notes: string | null;
}

export const useUsernamePermissions = (userEmail?: string) => {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchUserPermissions = async (email: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Primary: use RPC to resolve permissions by email (can include complex logic)
      const { data, error } = await supabase.rpc('get_user_username_permissions', {
        user_email_param: email
      });

      if (error) throw error;

      let permissionsList: string[] = data?.map((p: UserPermissionSummary) => p.module_name) || [];

      // Fallback: direct lookup on username_permissions with case-insensitive email match
      if (!permissionsList.length) {
        const { data: rows, error: fallbackErr } = await supabase
          .from('username_permissions')
          .select('module_name')
          .eq('is_active', true)
          .ilike('user_email', email);
        if (!fallbackErr && rows) {
          permissionsList = rows.map((r: { module_name: string }) => r.module_name);
        }
      }

      setPermissions(permissionsList);
    } catch (err: any) {
      console.error('Error fetching username permissions:', err);
      setError(err.message);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userEmail) {
      fetchUserPermissions(userEmail);
    } else {
      setPermissions([]);
      setLoading(false);
    }
  }, [userEmail]);

  return {
    permissions,
    loading,
    error,
    refetch: () => userEmail && fetchUserPermissions(userEmail)
  };
};

export const useUsernamePermissionsAdmin = () => {
  const [allPermissions, setAllPermissions] = useState<UsernamePermission[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchAllPermissions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('username_permissions')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAllPermissions(data || []);
    } catch (err: any) {
      console.error('Error fetching all permissions:', err);
      toast({
        title: "Error",
        description: "Failed to fetch permissions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const grantPermission = async (
    userEmail: string,
    moduleName: string,
    expiresAt?: string,
    notes?: string
  ) => {
    try {
      console.log('🔍 Attempting to upsert permission:', {
        userEmail,
        moduleName,
        expiresAt,
        notes
      });

      const { data, error } = await supabase
        .from('username_permissions')
        .upsert({
          user_email: userEmail,
          module_name: moduleName,
          expires_at: expiresAt || null,
          notes: notes || null,
          is_active: true
        }, {
          onConflict: 'user_email,module_name'
        })
        .select();

      console.log('🔍 Upsert result:', { data, error });

      if (error) {
        console.error('🚨 Database error:', error);
        throw error;
      }

      toast({
        title: "Permission Granted",
        description: `${moduleName} access granted to ${userEmail}`,
      });

      await fetchAllPermissions();
      return true;
    } catch (err: any) {
      console.error('🚨 Error granting permission:', err);
      toast({
        title: "Error",
        description: `Failed to grant permission: ${err.message || 'Unknown error'}`,
        variant: "destructive",
      });
      return false;
    }
  };

  const revokePermission = async (userEmail: string, moduleName: string) => {
    try {
      const { error } = await supabase
        .from('username_permissions')
        .update({ is_active: false })
        .eq('user_email', userEmail)
        .eq('module_name', moduleName);

      if (error) throw error;

      toast({
        title: "Permission Revoked",
        description: `${moduleName} access revoked from ${userEmail}`,
      });

      await fetchAllPermissions();
      return true;
    } catch (err: any) {
      console.error('Error revoking permission:', err);
      toast({
        title: "Error",
        description: "Failed to revoke permission",
        variant: "destructive",
      });
      return false;
    }
  };

  const getUserPermissions = async (userEmail: string): Promise<UserPermissionSummary[]> => {
    try {
      // Primary via RPC
      const { data, error } = await supabase.rpc('get_user_username_permissions', {
        user_email_param: userEmail
      });
      if (!error && data?.length) {
        return data as UserPermissionSummary[];
      }

      // Fallback: direct table lookup (case-insensitive email)
      const { data: rows, error: fbErr } = await supabase
        .from('username_permissions')
        .select('module_name, created_at, expires_at, notes')
        .eq('is_active', true)
        .ilike('user_email', userEmail);

      if (fbErr || !rows) return [];

      return rows.map((r: any) => ({
        module_name: r.module_name,
        granted_at: r.created_at,
        expires_at: r.expires_at,
        notes: r.notes,
      }));
    } catch (err: any) {
      console.error('Error fetching user permissions:', err);
      return [];
    }
  };

  useEffect(() => {
    fetchAllPermissions();
  }, []);

  return {
    allPermissions,
    loading,
    fetchAllPermissions,
    grantPermission,
    revokePermission,
    getUserPermissions
  };
};