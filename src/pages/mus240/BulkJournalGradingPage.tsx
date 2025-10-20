import React from 'react';
import { BulkJournalGrading } from '@/components/mus240/instructor/BulkJournalGrading';
import { Navigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { useCourseTA } from '@/hooks/useCourseTA';

export const BulkJournalGradingPage = () => {
  const { isAdmin, loading } = useUserRole();
  const { isTA, loading: taLoading } = useCourseTA('MUS240');

  if (loading || taLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Allow both admins and TAs to access
  if (!isAdmin() && !isTA) {
    return <Navigate to="/classes/mus240" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <BulkJournalGrading />
      </div>
    </div>
  );
};