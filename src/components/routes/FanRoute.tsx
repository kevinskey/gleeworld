import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';

interface FanRouteProps {
  children: React.ReactNode;
}

export const FanRoute: React.FC<FanRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const { isFan, isMember, isAdmin, isSuperAdmin, loading: roleLoading } = useUserRole();
  const location = useLocation();

  console.log('🎵 FanRoute DEBUG:', {
    hasUser: !!user,
    loading,
    roleLoading,
    pathname: location.pathname,
    isFan: isFan(),
    isMember: isMember(),
    isAdmin: isAdmin(),
    isSuperAdmin: isSuperAdmin()
  });

  // Still loading auth or role data
  if (loading || roleLoading) {
    console.log('🎵 FanRoute: Still loading auth or role...');
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  // No user - redirect to signup as fan
  if (!user) {
    console.log('🎵 FanRoute: No user found, redirecting to fan signup');
    // Store current path for redirect after signup
    const currentPath = location.pathname + location.search;
    try {
      sessionStorage.setItem('redirectAfterAuth', currentPath);
      console.log('FanRoute: Storing redirect path:', currentPath);
    } catch (error) {
      console.warn('FanRoute: Could not store redirect path:', error);
    }
    return <Navigate to="/auth?mode=signup&role=fan" state={{ from: location }} replace />;
  }

  // User exists but doesn't have fan access - show upgrade prompt
  const hasAccess = isFan() || isMember() || isAdmin() || isSuperAdmin();
  if (!hasAccess) {
    console.log('🎵 FanRoute: User lacks fan access, redirecting to fan signup');
    return <Navigate to="/auth?mode=signup&role=fan&upgrade=true" state={{ from: location }} replace />;
  }

  console.log('🎵 FanRoute: User has fan access, rendering children');
  return <>{children}</>;
};