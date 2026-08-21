import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { USER_ROLES, isRoleAtLeast } from "@/constants/permissions";
import { usePreviewRole } from "@/lib/nav/navPreview";
import { useMyTenantRole } from "@/hooks/useEffectivePreviewRole";
import { isTenantAdminOrAboveRole } from "@/lib/auth/tenantRoles";
import { previewCapabilities } from "@/lib/auth/previewClamp";

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  role: string;
  full_name?: string;
  is_admin: boolean;
  is_super_admin: boolean;
  is_exec_board?: boolean | null;
  is_partner?: boolean | null;
  verified?: boolean;
  /** The user's personal name for the assistant — per user, not per tenant. */
  assistant_name?: string | null;
  preferred_name?: string | null;
}

// gw_tenant_members.role for the CURRENT tenant (x-tenant-slug aware). A
// provisioned tenant admin's profile row may still carry their old home role
// (e.g. 'fan') — the membership row is what actually grants tenant rights,
// so it must outrank the profile role (campbell-hs-chorus incident 2026-08-02).
const MEMBER_SUPER_ROLES = ['super-admin', 'super_admin'];
const MEMBER_ADMIN_ROLES = ['admin', 'director'];

export const useUserRole = () => {
  const { user } = useAuth();
  // "Views" preview. Applied HERE rather than per page because every gate in
  // the app funnels through this hook — 120 files — so this is the only
  // place that makes "see what a student sees" true everywhere instead of
  // on the six pages that had wired it up by hand.
  //
  // Gated on the caller's REAL tenant role, and every clamp is a downgrade,
  // so a forged preview value can never grant anything.
  const previewRole = usePreviewRole();
  const myTenantRole = useMyTenantRole();
  const preview = previewCapabilities(previewRole, isTenantAdminOrAboveRole(myTenantRole));
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [memberRole, setMemberRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasSecretaryAppRole, setHasSecretaryAppRole] = useState(false);
  const [hasLibrarianAppRole, setHasLibrarianAppRole] = useState(false);
  const [hasWardrobeAppRole, setHasWardrobeAppRole] = useState(false);

  useEffect(() => {
    const fetchUserProfileAndRoles = async () => {
      if (!user) {
        setProfile(null);
        setMemberRole(null);
        setHasSecretaryAppRole(false);
        setHasLibrarianAppRole(false);
        setHasWardrobeAppRole(false);
        setLoading(false);
        return;
      }

      try {
        const [profileResult, appRolesResult, memberRoleResult] = await Promise.all([
          supabase
            .from('gw_profiles')
            .select('id, user_id, email, role, full_name, is_admin, is_super_admin, is_exec_board, verified, assistant_name, preferred_name')
            .eq('user_id', user.id)
            .maybeSingle(),
          supabase
            .from('app_roles')
            .select('role')
            .eq('user_id', user.id)
            .eq('is_active', true),
          supabase.rpc('get_my_membership_role')
        ]);

        if (profileResult.error) {
          console.error('useUserRole error:', profileResult.error.message);
          setProfile(null);
        } else {
          setProfile(profileResult.data);
        }

        // RPC missing (pre-migration deploy) or errored → just fall back to
        // the profile role; never block role resolution on it.
        setMemberRole(memberRoleResult.error ? null : (memberRoleResult.data as string | null));

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
    if (preview) return preview.effectiveRole;
    if (profile.is_super_admin) return USER_ROLES.SUPER_ADMIN;
    if (memberRole && MEMBER_SUPER_ROLES.includes(memberRole)) return USER_ROLES.SUPER_ADMIN;
    if (profile.is_admin) return USER_ROLES.ADMIN;
    if (memberRole && MEMBER_ADMIN_ROLES.includes(memberRole)) return USER_ROLES.ADMIN;
    return profile.role || USER_ROLES.VISITOR;
  };

  const hasRoleLevel = (minimumRole: typeof USER_ROLES[keyof typeof USER_ROLES]): boolean => {
    return isRoleAtLeast(getEffectiveRole(), minimumRole);
  };

  const isSuperAdmin = (): boolean => {
    if (!profile) return false;
    if (preview) return preview.isSuperAdmin;
    if (memberRole && MEMBER_SUPER_ROLES.includes(memberRole)) return true;
    return profile.is_super_admin || profile.role === 'director' || profile.role === USER_ROLES.SUPER_ADMIN;
  };

  const isAdmin = (): boolean => {
    if (!profile) return false;
    if (preview) return preview.isAdmin;
    if (isSuperAdmin()) return true;
    if (memberRole && MEMBER_ADMIN_ROLES.includes(memberRole)) return true;
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
    if (preview) return preview.isStudent;
    return profile.role === USER_ROLES.STUDENT || profile.role === USER_ROLES.MEMBER;
  };

  const isMember = isStudent;

  const isAlumna = (): boolean => {
    if (!profile) return false;
    return profile.role === USER_ROLES.ALUMNA || profile.role === 'alumni' || profile.role === 'graduates';
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

  // App grants (librarian / wardrobe / secretary) are per-user, not roles,
  // so they survive a clamp unless the preview is of an ordinary member.
  const appGrant = (granted: boolean): boolean =>
    (preview && !preview.keepAppGrants) ? false : granted;

  const canDownloadPDF = (): boolean => {
    if (!profile) return false;
    if (isAdmin()) return true;
    return appGrant(hasLibrarianAppRole);
  };

  const canDownloadMP3 = (): boolean => isSuperAdmin();

  const isWardrobeManager = (): boolean => {
    if (!profile) return false;
    if (isAdmin()) return true;
    return appGrant(hasWardrobeAppRole);
  };

  const isSecretary = (): boolean => {
    if (!profile) return false;
    if (isAdmin()) return true;
    return appGrant(hasSecretaryAppRole);
  };

  const isCourseTA = (_courseCode: string = 'GW240'): boolean => {
    if (!profile) return false;
    return isAdmin() || isInstructor();
  };

  const canManageUsers = (): boolean => {
    if (!profile) return false;
    return isAdmin();
  };

  const canDeleteUsers = (): boolean => isSuperAdmin();
  const canManageSystemSettings = (): boolean => isSuperAdmin();

  // Music Library write capability — uploading scores, editing metadata
  // (title/composer/voicing/copies/location), attaching audio. Students
  // (and below) can still open + annotate scores; annotations are RLS-
  // scoped to user_id so each student has their own personal markup.
  // useCallback so consumers can treat this as a stable dependency —
  // a fresh closure every render made downstream useMemos (HouseHome's
  // NavContext) inert. isSuperAdmin/isAdmin only read `profile`, which
  // is a dep, so the captured closures are never stale.
  const canEditMusicLibrary = useCallback((): boolean => {
    if (!profile) return false;
    if (isSuperAdmin() || isAdmin()) return true;
    if (preview && !preview.keepAppGrants) return false;
    if (hasLibrarianAppRole) return true;
    if (profile.role === 'librarian') return true;
    return false;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- isSuperAdmin/isAdmin are render-scoped closures over `profile` only
  }, [profile, hasLibrarianAppRole, preview]);

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
    canEditMusicLibrary,
    hasLibrarianAppRole,
  };
};
