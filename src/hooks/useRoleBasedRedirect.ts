
import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";

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
      pathname: location.pathname
    });

    if (loading || !user || !userProfile) {
      console.log('useRoleBasedRedirect: Early return', { loading, hasUser: !!user, hasUserProfile: !!userProfile });
      return;
    }

    // Don't redirect if user is already on a specific page they navigated to
    const isOnAuthPage = location.pathname === '/auth';
    const isOnRootPage = location.pathname === '/';
    
    if (!isOnAuthPage && !isOnRootPage) {
      console.log('useRoleBasedRedirect: Not on auth or root page, skipping redirect');
      return;
    }

    // Role-based redirect logic
    const isAdmin = userProfile.role === 'admin' || userProfile.role === 'super-admin';
    const isAlumna = userProfile.role === 'alumna';
    
    console.log('useRoleBasedRedirect: Redirect logic', {
      userRole: userProfile.role,
      isAdmin,
      isAlumna,
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
    } else {
      console.log('useRoleBasedRedirect: Redirecting regular user to dashboard');
      navigate('/dashboard', { replace: true });
      window.scrollTo(0, 0);
    }
  }, [user, userProfile, loading, navigate, location.pathname]);

  return { userProfile, loading };
};
