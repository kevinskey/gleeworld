
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

    // If user exists but no profile after loading is complete, try fallback redirect
    if (!userProfile) {
      console.log('useRoleBasedRedirect: User exists but no profile found, attempting fallback redirect');
      // Only redirect from root or auth pages to prevent disrupting navigation
      if (location.pathname === '/' || location.pathname === '/auth') {
        navigate('/dashboard', { replace: true });
        window.scrollTo(0, 0);
      }
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
      // PRIORITY 1: Admin/Super Admin (direct check)
      const isAdmin = userProfile.is_admin || userProfile.is_super_admin || 
                     userProfile.role === 'admin' || userProfile.role === 'super-admin';
      
      console.log('🔍 Admin check details:', {
        is_admin: userProfile.is_admin,
        is_super_admin: userProfile.is_super_admin,
        role: userProfile.role,
        isAdmin,
        fullProfile: userProfile
      });
      
      if (isAdmin) {
        console.log('🚀 useRoleBasedRedirect: ADMIN detected - direct redirect to /admin');
        navigate('/admin', { replace: true });
        return;
      }
      
      // PRIORITY 2: Alumna
      if (userProfile.role === 'alumna') {
        console.log('🎓 useRoleBasedRedirect: Alumna redirect to /alumnae');
        navigate('/alumnae', { replace: true });
        return;
      }
      
      // PRIORITY 3: Fans  
      if (userProfile.role === 'fan') {
        console.log('🎵 useRoleBasedRedirect: Fan redirect to /fan');
        navigate('/fan', { replace: true });
        return;
      }
      
      // PRIORITY 4: Members (all members including exec board get modular dashboard)
      if (userProfile.role === 'member' || userProfile.is_exec_board) {
        console.log('👤 useRoleBasedRedirect: Member/Executive redirect to /dashboard');
        navigate('/dashboard', { replace: true });
        return;
      }
      
      // PRIORITY 5: Default fallback for other roles
      console.log('👤 useRoleBasedRedirect: Default user redirect to /dashboard');
      navigate('/dashboard', { replace: true });
    };

    handleRedirect();
  }, [user, userProfile, loading, navigate, location.pathname]);

  return { userProfile, loading };
};
