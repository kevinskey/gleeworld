import React from 'react';
import { JournalBrowserForReview } from '@/components/mus240/peer-review/JournalBrowserForReview';
import { useUserRole } from '@/hooks/useUserRole';
import { Navigate } from 'react-router-dom';

export const PeerReviewBrowserPage = () => {
  const { profile, loading } = useUserRole();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Only students and members can access peer review (or just allow anyone not admin)
  if (profile?.role === 'admin' || profile?.role === 'super_admin') {
    return <Navigate to="/classes/mus240" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Peer Review</h1>
          <p className="text-muted-foreground">
            Review your classmates' journal entries and provide constructive feedback
          </p>
        </div>

        <JournalBrowserForReview />
      </div>
    </div>
  );
};
