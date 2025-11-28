import React from 'react';
import { JournalBrowserForReview } from '@/components/mus240/peer-review/JournalBrowserForReview';
import { useUserRole } from '@/hooks/useUserRole';
import { Navigate, useNavigate } from 'react-router-dom';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export const PeerReviewBrowserPage = () => {
  const { profile, loading } = useUserRole();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Only students and members can access peer review (or just allow anyone not admin)
  if (profile?.role === 'admin' || profile?.role === 'super_admin') {
    return <Navigate to="/mus-240" replace />;
  }

  return (
    <UniversalLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/grading/instructor/dashboard')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Grading Dashboard
        </Button>
        
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Peer Review</h1>
          <p className="text-muted-foreground">
            Review your classmates' journal entries and provide constructive feedback
          </p>
        </div>

        <JournalBrowserForReview />
      </div>
    </UniversalLayout>
  );
};
