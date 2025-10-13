import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

interface AlumnaeRouteProps {
  children: React.ReactNode;
}

export const AlumnaeRoute: React.FC<AlumnaeRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const { profile, loading: roleLoading } = useUserRole();
  const location = useLocation();

  console.log('🎓 AlumnaeRoute DEBUG:', {
    hasUser: !!user,
    loading,
    roleLoading,
    pathname: location.pathname,
    role: profile?.role,
    isAlumna: profile?.role === 'alumna'
  });

  // Still loading auth or role data
  if (loading || roleLoading) {
    console.log('🎓 AlumnaeRoute: Still loading auth or role...');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  // No user - redirect to auth
  if (!user) {
    console.log('🎓 AlumnaeRoute: No user found, redirecting to auth');
    const currentPath = location.pathname + location.search;
    try {
      sessionStorage.setItem('redirectAfterAuth', currentPath);
      console.log('AlumnaeRoute: Storing redirect path:', currentPath);
    } catch (error) {
      console.warn('AlumnaeRoute: Could not store redirect path:', error);
    }
    return <Navigate to="/auth?role=alumna" state={{ from: location }} replace />;
  }

  // User exists but doesn't have alumna role
  const hasAccess = profile?.role === 'alumna' || profile?.is_admin || profile?.is_super_admin;
  if (!hasAccess) {
    console.log('🎓 AlumnaeRoute: User lacks alumna access, redirecting to dashboard');
    return <Navigate to="/dashboard" state={{ from: location }} replace />;
  }

  console.log('🎓 AlumnaeRoute: User has alumna access, rendering children');
  return <>{children}</>;
};
