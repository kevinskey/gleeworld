
import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { supabase } from "@/integrations/supabase/client";

export const useRoleBasedRedirect = () => {
  const { user, loading } = useAuth();
  const { userProfile } = useUserProfile(user);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.log('🔍 useRoleBasedRedirect: Effect triggered', {
      loading,
      hasUser: !!user,
      hasUserProfile: !!userProfile,
      userRole: userProfile?.role,
      isAdmin: userProfile?.is_admin,
      isSuperAdmin: userProfile?.is_super_admin,
      isExecBoard: userProfile?.is_exec_board,
      execBoardRole: userProfile?.exec_board_role,
      verified: userProfile?.verified,
      pathname: location.pathname,
      timestamp: new Date().toISOString()
    });

    // Early return if still loading
    if (loading) {
      console.log('🔍 useRoleBasedRedirect: Still loading auth or profile');
      return;
    }

    // If no user, don't redirect (let them stay on public pages)
    if (!user) {
      console.log('useRoleBasedRedirect: No user found');
      return;
    }

    // If user exists but no profile after loading is complete, don't auto-redirect
    if (!userProfile) {
      console.log('useRoleBasedRedirect: User exists but no profile found');
      return;
    }

    // Check if user is in executive board table
    const checkExecutiveStatus = async () => {
      const { data: execData } = await supabase
        .from('gw_executive_board_members')
        .select('position, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();
      
      console.log('useRoleBasedRedirect: Executive board data from table:', execData);
      return execData;
    };

    // Don't redirect if user is already on a specific page they navigated to
    const isOnAuthPage = location.pathname === '/auth';
    const isOnRootPage = location.pathname === '/';

    // Respect explicit request to view public home (from header click)
    const forcePublic = sessionStorage.getItem('force-public-view') === '1';
    if (isOnRootPage && forcePublic) {
      console.log('🛑 useRoleBasedRedirect: Force public view enabled, skipping auto-redirect');
      sessionStorage.removeItem('force-public-view');
      return;
    }
    
    // Also skip redirect if user is already on their target dashboard
    const isOnTargetPage = location.pathname.includes('/admin') || 
                          location.pathname.includes('/dashboard') || 
                          location.pathname.includes('/fan') || 
                          location.pathname.includes('/alumnae');
    
    if (!isOnAuthPage && !isOnRootPage && isOnTargetPage) {
      console.log('useRoleBasedRedirect: Already on target page, skipping redirect');
      return;
    }

    // Streamlined redirect logic with admin priority
    const handleRedirect = async () => {
      // Check if this is coming from auth/login (sessionStorage indicator)
      const redirectAfterAuth = sessionStorage.getItem('redirectAfterAuth');
      const isPostLogin = redirectAfterAuth !== null || location.pathname === '/auth';
      
      // For public pages other than root, don't auto-redirect unless coming from auth
      if (!isPostLogin) {
        if (!isOnRootPage) {
          console.log('🏠 useRoleBasedRedirect: User on public page (not root), not redirecting automatically');
          return;
        } else {
          console.log('🚀 useRoleBasedRedirect: Authenticated user on root, redirecting to role-based home');
        }
      }

      // PRIORITY 1: Super Admin -> Admin Panel  
      if (userProfile.is_super_admin || userProfile.role === 'super-admin') {
        console.log('🚀 useRoleBasedRedirect: Super Admin redirect to /admin');
        navigate('/admin', { replace: true });
        return;
      }

      // PRIORITY 2: Admin or Executive Board -> Admin Panel
      if (userProfile.is_admin || userProfile.role === 'admin' || userProfile.is_exec_board) {
        console.log('🚀 useRoleBasedRedirect: Admin/Executive redirect to /admin');
        navigate('/admin', { replace: true });
        return;
      }

      // (Removed dedicated executive board dashboard)


      // PRIORITY 4: Alumna
      if (userProfile.role === 'alumna') {
        console.log('🎓 useRoleBasedRedirect: Alumna redirect to /alumnae');
        navigate('/alumnae', { replace: true });
        return;
      }
      
      // PRIORITY 5: Fans  
      if (userProfile.role === 'fan') {
        console.log('🎵 useRoleBasedRedirect: Fan redirect to /fan');
        navigate('/fan', { replace: true });
        return;
      }
      
      // PRIORITY 6: Regular Members -> simplified Member Dashboard
      if (userProfile.role === 'member') {
        console.log('👤 useRoleBasedRedirect: Member redirect to unified dashboard');
        navigate('/dashboard', { replace: true });
        return;
      }
      
      // PRIORITY 5: Default fallback - NO AUTOMATIC REDIRECT
      console.log('👤 useRoleBasedRedirect: No matching role, staying on current page');
      return;
    };

    handleRedirect();
  }, [user, userProfile, loading, navigate, location.pathname]);

  return { userProfile, loading };
};
