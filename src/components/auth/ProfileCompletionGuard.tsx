import React, { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

interface ProfileCompletionGuardProps {
  children: ReactNode;
}

// Pages that should be exempt from profile completion check
const EXEMPT_PATHS = [
  '/profile/setup',
  '/profile-setup',
  '/force-password-change',
  '/auth',
  '/reset-password',
  '/onboarding',
];

export const ProfileCompletionGuard: React.FC<ProfileCompletionGuardProps> = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const [isProfileComplete, setIsProfileComplete] = useState(true);

  useEffect(() => {
    const checkProfileCompletion = async () => {
      if (!user) {
        setIsChecking(false);
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from('gw_profiles')
          .select('full_name, first_name, last_name, email')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error checking profile completion:', error);
          setIsProfileComplete(true); // Don't block on error
          setIsChecking(false);
          return;
        }

        // Profile is complete if they have a full_name OR (first_name AND last_name)
        const hasName = profile?.full_name || (profile?.first_name && profile?.last_name);
        setIsProfileComplete(!!hasName);
      } catch (err) {
        console.error('Profile check error:', err);
        setIsProfileComplete(true); // Don't block on error
      } finally {
        setIsChecking(false);
      }
    };

    checkProfileCompletion();
  }, [user]);

  // Check if current path is exempt
  const isExemptPath = EXEMPT_PATHS.some(path => location.pathname.startsWith(path));

  if (isChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner size="lg" text="Checking profile..." />
      </div>
    );
  }

  // Redirect to profile setup if profile is incomplete and not on exempt path
  if (!isProfileComplete && !isExemptPath) {
    return <Navigate to="/profile/setup" replace state={{ fromIncomplete: true }} />;
  }

  return <>{children}</>;
};
