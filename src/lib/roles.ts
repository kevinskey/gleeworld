import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type UserRole = 'super_admin' | 'admin' | 'member' | 'bowman_scholar' | 'student';

// Check if user has a specific role
export const hasRole = async (userId: string, role: UserRole): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('user_roles_multi')
      .select('role')
      .eq('user_id', userId)
      .eq('role', role)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking role:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error checking role:', error);
    return false;
  }
};

// Add role to user
export const addRole = async (userId: string, role: UserRole): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('user_roles_multi')
      .insert({ user_id: userId, role });

    if (error) {
      console.error('Error adding role:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error adding role:', error);
    return { success: false, error: 'Failed to add role' };
  }
};

// Remove role from user
export const removeRole = async (userId: string, role: UserRole): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('user_roles_multi')
      .delete()
      .eq('user_id', userId)
      .eq('role', role);

    if (error) {
      console.error('Error removing role:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error removing role:', error);
    return { success: false, error: 'Failed to remove role' };
  }
};

// Get all roles for a user
export const getUserRoles = async (userId: string): Promise<UserRole[]> => {
  try {
    const { data, error } = await supabase
      .from('user_roles_multi')
      .select('role')
      .eq('user_id', userId);

    if (error) {
      console.error('Error getting user roles:', error);
      return [];
    }

    return data?.map(row => row.role as UserRole) || [];
  } catch (error) {
    console.error('Error getting user roles:', error);
    return [];
  }
};

// Convenience functions for specific roles
export const isBowmanScholar = (userId: string) => hasRole(userId, 'bowman_scholar');
export const isSuperAdmin = (userId: string) => hasRole(userId, 'super_admin');
export const isAdmin = (userId: string) => hasRole(userId, 'admin');
export const isMember = (userId: string) => hasRole(userId, 'member');
export const isStudent = (userId: string) => hasRole(userId, 'student');

// React hook for role management
export const useRoles = (userId?: string) => {
  const { toast } = useToast();

  const addUserRole = async (role: UserRole) => {
    if (!userId) return { success: false, error: 'No user ID provided' };
    
    const result = await addRole(userId, role);
    if (result.success) {
      toast({
        title: "Role Added",
        description: `Successfully added ${role} role`,
      });
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to add role",
        variant: "destructive",
      });
    }
    return result;
  };

  const removeUserRole = async (role: UserRole) => {
    if (!userId) return { success: false, error: 'No user ID provided' };
    
    const result = await removeRole(userId, role);
    if (result.success) {
      toast({
        title: "Role Removed",
        description: `Successfully removed ${role} role`,
      });
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to remove role",
        variant: "destructive",
      });
    }
    return result;
  };

  return {
    addUserRole,
    removeUserRole,
    getUserRoles: userId ? () => getUserRoles(userId) : undefined,
    hasUserRole: userId ? (role: UserRole) => hasRole(userId, role) : undefined,
  };
};