import { supabase } from "@/integrations/supabase/client";
import { EXECUTIVE_BOARD_ROLES } from "@/constants/executiveBoardRoles";

/**
 * Check if a user has Chief of Staff privileges (admin-level access)
 */
export const hasChiefOfStaffAccess = async (userId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('gw_profiles')
      .select('exec_board_role, is_admin')
      .eq('user_id', userId)
      .single();

    if (error || !data) return false;

    // Chief of Staff has admin access OR user is explicitly admin
    return data.exec_board_role === EXECUTIVE_BOARD_ROLES.CHIEF_OF_STAFF || data.is_admin;
  } catch (error) {
    console.error('Error checking Chief of Staff access:', error);
    return false;
  }
};

/**
 * Check if current authenticated user has executive board access
 */
export const hasExecutiveBoardAccess = async (): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('gw_profiles')
      .select('is_exec_board, exec_board_role, is_admin, is_super_admin')
      .eq('user_id', user.id)
      .single();

    if (error || !data) return false;

    // Has access if: exec board member, admin, super admin, or chief of staff
    return data.is_exec_board || 
           data.is_admin || 
           data.is_super_admin || 
           data.exec_board_role === EXECUTIVE_BOARD_ROLES.CHIEF_OF_STAFF;
  } catch (error) {
    console.error('Error checking executive board access:', error);
    return false;
  }
};

/**
 * Get all permissions for an executive board role
 */
export const getRolePermissions = (role: string): string[] => {
  const { EXEC_BOARD_MODULE_PERMISSIONS } = require('@/constants/executiveBoardRoles');
  return EXEC_BOARD_MODULE_PERMISSIONS[role] || [];
};

/**
 * Check if a role has specific permission
 */
export const roleHasPermission = (role: string, permission: string): boolean => {
  const permissions = getRolePermissions(role);
  return permissions.includes(permission);
};