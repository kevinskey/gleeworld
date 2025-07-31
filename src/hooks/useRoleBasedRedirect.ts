
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
    console.log('useRoleBasedRedirect: Effect triggered', {
      loading,
      hasUser: !!user,
      hasUserProfile: !!userProfile,
      userRole: userProfile?.role,
      isAdmin: userProfile?.is_admin,
      isSuperAdmin: userProfile?.is_super_admin,
      isExecBoard: userProfile?.is_exec_board,
      execBoardRole: userProfile?.exec_board_role,
      pathname: location.pathname
    });

    if (loading || !user || !userProfile) {
      console.log('useRoleBasedRedirect: Early return', { loading, hasUser: !!user, hasUserProfile: !!userProfile });
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
    
    if (!isOnAuthPage && !isOnRootPage) {
      console.log('useRoleBasedRedirect: Not on auth or root page, skipping redirect');
      return;
    }

    // Async function to handle executive board check and redirect
    const handleRedirect = async () => {
      // Role-based redirect logic
      const isAdmin = userProfile.role === 'admin' || userProfile.role === 'super-admin';
      const isAlumna = userProfile.role === 'alumna';
      
      // Check executive board status from profile AND table
      const isExecBoardFromProfile = userProfile.is_exec_board || userProfile.is_admin || userProfile.is_super_admin;
      const execBoardData = await checkExecutiveStatus();
      const isExecutiveBoard = isExecBoardFromProfile || !!execBoardData;
      
      console.log('useRoleBasedRedirect: Redirect logic', {
        userRole: userProfile.role,
        isAdmin,
        isAlumna,
        isExecutiveBoard,
        isExecBoardFromProfile,
        execBoardData,
        currentPath: location.pathname
      });
      
      if (isAdmin) {
        console.log('useRoleBasedRedirect: Redirecting admin to dashboard');
        navigate('/dashboard', { replace: true });
        window.scrollTo(0, 0);
      } else if (isAlumna) {
        console.log('useRoleBasedRedirect: Redirecting alumna to alumnae portal');
        navigate('/alumnae', { replace: true });
        window.scrollTo(0, 0);
      } else if (isExecutiveBoard) {
        console.log('useRoleBasedRedirect: Redirecting exec board member to executive board dashboard');
        navigate('/dashboard/executive-board', { replace: true });
        window.scrollTo(0, 0);
      } else {
        console.log('useRoleBasedRedirect: Redirecting regular user to dashboard');
        navigate('/dashboard', { replace: true });
        window.scrollTo(0, 0);
      }
    };

    handleRedirect();
  }, [user, userProfile, loading, navigate, location.pathname]);

  return { userProfile, loading };
};
