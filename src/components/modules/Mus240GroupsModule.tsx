import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useMus240Enrollment } from '@/hooks/useMus240Enrollment';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

export const Mus240GroupsModule = () => {
  const { user } = useAuth();
  const { isEnrolled, loading } = useMus240Enrollment();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isEnrolled()) {
    return (
      <div className="p-6">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-amber-800 mb-2">
            MUS240 Enrollment Required
          </h2>
          <p className="text-amber-700">
            You must be enrolled in MUS240 to access project groups. 
            Please contact your instructor if you believe this is an error.
          </p>
        </div>
      </div>
    );
  }

  // Redirect to the full MUS240 Groups page
  return <Navigate to="/classes/mus240/groups" replace />;
};