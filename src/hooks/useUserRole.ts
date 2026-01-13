import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { USER_ROLES, getRoleLevel, isRoleAtLeast } from "@/constants/permissions";

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  role: string;
  full_name?: string;
  is_admin: boolean;
  is_super_admin: boolean;
  exec_board_role?: string;
  is_exec_board: boolean;
  verified?: boolean;
}

/**
 * Hook for checking user roles and permissions
 * 
 * ROLE HIERARCHY (highest to lowest):
 * 1. Super Admin (Director) - Full system control
 * 2. Admin - Appointed staff with management access
 * 3. Executive Board - Elected student officers
 * 4. Instructor - Course instructors
 * 5. Student/Member - Active members
 * 6. Alumna - Graduates
 * 7. Auditioner - Applicants
 * 8. Fan - Supporters
 * 9. Visitor - Unauthenticated
 */
export const useUserRole = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('gw_profiles')
          .select('id, user_id, email, role, full_name, is_admin, is_super_admin, exec_board_role, is_exec_board, verified')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('useUserRole error:', error.message);
          setProfile(null);
        } else {
          setProfile(data);
        }
      } catch (error) {
        console.error('useUserRole error:', error);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [user]);

  /**
   * Get the effective role considering is_admin and is_super_admin flags
   */
  const getEffectiveRole = (): string => {
    if (!profile) return USER_ROLES.VISITOR;
    
    // is_super_admin flag takes highest priority
    if (profile.is_super_admin) return USER_ROLES.SUPER_ADMIN;
    
    // is_admin flag means admin role
    if (profile.is_admin) return USER_ROLES.ADMIN;
    
    // is_exec_board flag means executive role
    if (profile.is_exec_board) return USER_ROLES.EXECUTIVE;
    
    // Otherwise use the role field
    return profile.role || USER_ROLES.VISITOR;
  };

  /**
   * Check if user is at least a certain role level
   */
  const hasRoleLevel = (minimumRole: typeof USER_ROLES[keyof typeof USER_ROLES]): boolean => {
    return isRoleAtLeast(getEffectiveRole(), minimumRole);
  };

  // ============ ROLE CHECKS ============

  /**
   * Super Admin (Director) - Highest level, full system control
   * Only the Director should have this role
   */
  const isSuperAdmin = (): boolean => {
    if (!profile) return false;
    return profile.is_super_admin || profile.role === 'director' || profile.role === USER_ROLES.SUPER_ADMIN;
  };

  /**
   * Admin - Appointed staff (accompanist, assistants, advisors)
   * Can manage users, content, contracts, emails, events, budgets
   * CANNOT: delete users, manage system settings, approve final budgets
   */
  const isAdmin = (): boolean => {
    if (!profile) return false;
    // Super admins are also admins
    if (isSuperAdmin()) return true;
    return profile.is_admin || profile.role === USER_ROLES.ADMIN;
  };

  /**
   * Executive Board - Elected student officers
   * Role-specific permissions based on position
   */
  const isExecutiveBoard = (): boolean => {
    if (!profile) return false;
    // Admins and super admins have exec board access too
    if (isAdmin()) return true;
    return profile.is_exec_board || profile.role === USER_ROLES.EXECUTIVE;
  };

  /**
   * Instructor - Course instructors
   */
  const isInstructor = (): boolean => {
    if (!profile) return false;
    if (isAdmin()) return true; // Admins can do instructor tasks
    return profile.role === USER_ROLES.INSTRUCTOR;
  };

  /**
   * Student/Member - Active Glee Club members
   */
  const isStudent = (): boolean => {
    if (!profile) return false;
    return profile.role === USER_ROLES.STUDENT || profile.role === USER_ROLES.MEMBER;
  };

  /**
   * Alias for backwards compatibility
   */
  const isMember = isStudent;

  /**
   * Alumna - Graduates
   */
  const isAlumna = (): boolean => {
    if (!profile) return false;
    return profile.role === USER_ROLES.ALUMNA;
  };

  /**
   * Auditioner - Applicants in audition process
   */
  const isAuditioner = (): boolean => {
    if (!profile) return false;
    return profile.role === USER_ROLES.AUDITIONER;
  };

  /**
   * Fan - Supporters
   */
  const isFan = (): boolean => {
    if (!profile) return false;
    return profile.role === USER_ROLES.FAN;
  };

  /**
   * Visitor - No profile or unauthenticated
   */
  const isVisitor = (): boolean => {
    if (!profile) return true;
    return profile.role === USER_ROLES.VISITOR;
  };

  // ============ SPECIFIC PERMISSION CHECKS ============

  /**
   * Can download PDF sheet music (Admin+ or Librarian)
   */
  const canDownloadPDF = (): boolean => {
    if (!profile) return false;
    if (isAdmin()) return true;
    return profile.exec_board_role === 'librarian';
  };

  /**
   * Can download MP3 audio files (Super Admin only)
   */
  const canDownloadMP3 = (): boolean => {
    if (!profile) return false;
    return isSuperAdmin();
  };

  /**
   * Wardrobe Manager - Can manage wardrobe inventory
   */
  const isWardrobeManager = (): boolean => {
    if (!profile) return false;
    if (isAdmin()) return true;
    return profile.exec_board_role === 'wardrobe_manager';
  };

  /**
   * Course TA check (basic version - full check in useCourseTA)
   */
  const isCourseTA = (courseCode: string = 'MUS240'): boolean => {
    if (!profile) return false;
    return isAdmin() || isInstructor();
  };

  /**
   * Can manage other users (Admin+ or Chief of Staff)
   */
  const canManageUsers = (): boolean => {
    if (!profile) return false;
    if (isAdmin()) return true;
    return profile.exec_board_role === 'chief_of_staff';
  };

  /**
   * Can delete users (Super Admin only)
   */
  const canDeleteUsers = (): boolean => {
    return isSuperAdmin();
  };

  /**
   * Can manage system settings (Super Admin only)
   */
  const canManageSystemSettings = (): boolean => {
    return isSuperAdmin();
  };

  return {
    profile,
    loading,
    getEffectiveRole,
    hasRoleLevel,
    
    // Role checks
    isSuperAdmin,
    isAdmin,
    isExecutiveBoard,
    isInstructor,
    isStudent,
    isMember, // Alias
    isAlumna,
    isAuditioner,
    isFan,
    isVisitor,
    
    // Specific permissions
    canDownloadPDF,
    canDownloadMP3,
    isWardrobeManager,
    isCourseTA,
    canManageUsers,
    canDeleteUsers,
    canManageSystemSettings,
  };
};
