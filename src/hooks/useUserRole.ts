import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { USER_ROLES, isRoleAtLeast } from "@/constants/permissions";

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  role: string;
  full_name?: string;
  is_admin: boolean;
  is_super_admin: boolean;
  verified?: boolean;
}

export const useUserRole = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasSecretaryAppRole, setHasSecretaryAppRole] = useState(false);
  const [hasLibrarianAppRole, setHasLibrarianAppRole] = useState(false);
  const [hasWardrobeAppRole, setHasWardrobeAppRole] = useState(false);

  useEffect(() => {
    const fetchUserProfileAndRoles = async () => {
      if (!user) {
        setProfile(null);
        setHasSecretaryAppRole(false);
        setHasLibrarianAppRole(false);
        setHasWardrobeAppRole(false);
        setLoading(false);
        return;
      }

      try {
        const [profileResult, appRolesResult] = await Promise.all([
          supabase
            .from('gw_profiles')
            .select('id, user_id, email, role, full_name, is_admin, is_super_admin, verified')
            .eq('user_id', user.id)
            .maybeSingle(),
          supabase
            .from('app_roles')
            .select('role')
            .eq('user_id', user.id)
            .eq('is_active', true)
        ]);

        if (profileResult.error) {
          console.error('useUserRole error:', profileResult.error.message);
          setProfile(null);
        } else {
          setProfile(profileResult.data);
        }

        const appRoles = (appRolesResult.data || []).map((r: any) => r.role);
        setHasSecretaryAppRole(appRoles.includes('secretary'));
        setHasLibrarianAppRole(appRoles.includes('librarian'));
        setHasWardrobeAppRole(appRoles.includes('wardrobe_manager') || appRoles.includes('wardrobe'));
      } catch (error) {
        console.error('useUserRole error:', error);
        setProfile(null);
        setHasSecretaryAppRole(false);
        setHasLibrarianAppRole(false);
        setHasWardrobeAppRole(false);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfileAndRoles();
  }, [user]);

  const getEffectiveRole = (): string => {
    if (!profile) return USER_ROLES.VISITOR;
    if (profile.is_super_admin) return USER_ROLES.SUPER_ADMIN;
    if (profile.is_admin) return USER_ROLES.ADMIN;
    return profile.role || USER_ROLES.VISITOR;
  };

  const hasRoleLevel = (minimumRole: typeof USER_ROLES[keyof typeof USER_ROLES]): boolean => {
    return isRoleAtLeast(getEffectiveRole(), minimumRole);
  };

  const isSuperAdmin = (): boolean => {
    if (!profile) return false;
    return profile.is_super_admin || profile.role === 'director' || profile.role === USER_ROLES.SUPER_ADMIN;
  };

  const isAdmin = (): boolean => {
    if (!profile) return false;
    if (isSuperAdmin()) return true;
    return profile.is_admin || profile.role === USER_ROLES.ADMIN;
  };

  // Kept for backwards compatibility — exec-board is gone, so this just
  // collapses to "is admin". Callers like canManageUsers rely on this.
  const isExecutiveBoard = (): boolean => isAdmin();

  const isInstructor = (): boolean => {
    if (!profile) return false;
    if (isAdmin()) return true;
    return profile.role === USER_ROLES.INSTRUCTOR;
  };

  const isStudent = (): boolean => {
    if (!profile) return false;
    return profile.role === USER_ROLES.STUDENT || profile.role === USER_ROLES.MEMBER;
  };

  const isMember = isStudent;

  const isAlumna = (): boolean => {
    if (!profile) return false;
    return profile.role === USER_ROLES.ALUMNA || profile.role === 'alumni' || profile.role === 'alumnae';
  };

  const isAuditioner = (): boolean => {
    if (!profile) return false;
    return profile.role === USER_ROLES.AUDITIONER;
  };

  const isFan = (): boolean => {
    if (!profile) return false;
    return profile.role === USER_ROLES.FAN || profile.role === 'vip';
  };

  const isVisitor = (): boolean => {
    if (!profile) return true;
    return profile.role === USER_ROLES.VISITOR;
  };

  const canDownloadPDF = (): boolean => {
    if (!profile) return false;
    if (isAdmin()) return true;
    return hasLibrarianAppRole;
  };

  const canDownloadMP3 = (): boolean => isSuperAdmin();

  const isWardrobeManager = (): boolean => {
    if (!profile) return false;
    if (isAdmin()) return true;
    return hasWardrobeAppRole;
  };

  const isSecretary = (): boolean => {
    if (!profile) return false;
    if (isAdmin()) return true;
    return hasSecretaryAppRole;
  };

  const isCourseTA = (_courseCode: string = 'MUS240'): boolean => {
    if (!profile) return false;
    return isAdmin() || isInstructor();
  };

  const canManageUsers = (): boolean => {
    if (!profile) return false;
    return isAdmin();
  };

  const canDeleteUsers = (): boolean => isSuperAdmin();
  const canManageSystemSettings = (): boolean => isSuperAdmin();

  return {
    profile,
    loading,
    getEffectiveRole,
    hasRoleLevel,

    isSuperAdmin,
    isAdmin,
    isExecutiveBoard,
    isInstructor,
    isStudent,
    isMember,
    isAlumna,
    isAuditioner,
    isFan,
    isVisitor,

    canDownloadPDF,
    canDownloadMP3,
    isWardrobeManager,
    isSecretary,
    isCourseTA,
    canManageUsers,
    canDeleteUsers,
    canManageSystemSettings,
  };
};
