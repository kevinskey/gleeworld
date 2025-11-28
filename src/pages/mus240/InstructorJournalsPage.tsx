import React from 'react';
import { InstructorJournalBrowser } from '@/components/mus240/instructor/InstructorJournalBrowser';
import { useUserRole } from '@/hooks/useUserRole';
import { Navigate } from 'react-router-dom';
import { UniversalLayout } from '@/components/layout/UniversalLayout';

export const InstructorJournalsPage = () => {
  const { profile, loading } = useUserRole();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Only instructors, admins, and TAs can access
  const isAuthorized = profile?.is_admin || profile?.is_super_admin || profile?.role === 'instructor';
  
  if (!isAuthorized) {
    return <Navigate to="/mus-240" replace />;
  }

  return (
    <UniversalLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">MUS240 Student Journals</h1>
          <p className="text-muted-foreground">
            View and review all student journal entries
          </p>
        </div>

        <InstructorJournalBrowser />
      </div>
    </UniversalLayout>
  );
};
