import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

interface GraduatesRouteProps {
  children: React.ReactNode;
}

export const GraduatesRoute: React.FC<GraduatesRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const { profile, loading: roleLoading } = useUserRole();
  const location = useLocation();

  console.log('🎓 GraduatesRoute DEBUG:', {
    hasUser: !!user,
    loading,
    roleLoading,
    pathname: location.pathname,
    role: profile?.role,
    isAlumna: profile?.role === 'graduate'
  });

  // Still loading auth or role data
  if (loading || roleLoading) {
    console.log('🎓 GraduatesRoute: Still loading auth or role...');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  // No user - redirect to auth
  if (!user) {
    console.log('🎓 GraduatesRoute: No user found, redirecting to auth');
    const currentPath = location.pathname + location.search;
    try {
      sessionStorage.setItem('redirectAfterAuth', currentPath);
      console.log('GraduatesRoute: Storing redirect path:', currentPath);
    } catch (error) {
      console.warn('GraduatesRoute: Could not store redirect path:', error);
    }
    return <Navigate to="/auth?role=graduate" state={{ from: location }} replace />;
  }

  // User exists but doesn't have graduate role
  const hasAccess = profile?.role === 'graduate' || profile?.is_admin || profile?.is_super_admin;
  if (!hasAccess) {
    console.log('🎓 GraduatesRoute: User lacks graduate access, redirecting to dashboard');
    return <Navigate to="/dashboard" state={{ from: location }} replace />;
  }

  console.log('🎓 GraduatesRoute: User has graduate access, rendering children');
  return <>{children}</>;
};
