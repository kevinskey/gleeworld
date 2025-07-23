
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
    if (loading || !user || !userProfile) return;

    // Don't redirect if user is already on a specific page they navigated to
    const isOnAuthPage = location.pathname === '/auth';
    const isOnRootPage = location.pathname === '/';
    
    if (!isOnAuthPage && !isOnRootPage) return;

    // Role-based redirect logic
    const isAdmin = userProfile.role === 'admin' || userProfile.role === 'super-admin';
    const isAlumna = userProfile.role === 'alumna';
    
    if (isAdmin) {
      navigate('/system', { replace: true });
      window.scrollTo(0, 0);
    } else if (isAlumna) {
      navigate('/alumnae', { replace: true });
      window.scrollTo(0, 0);
    } else {
      navigate('/dashboard', { replace: true });
      window.scrollTo(0, 0);
    }
  }, [user, userProfile, loading, navigate, location.pathname]);

  return { userProfile, loading };
};
