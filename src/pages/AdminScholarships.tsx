import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { ScholarshipManager } from '@/components/admin/ScholarshipManager';
import { Loader2, GraduationCap, Shield } from 'lucide-react';

const AdminScholarships = () => {
  const { user, loading: authLoading } = useAuth();

  // Redirect to auth if not logged in
  if (!authLoading && !user) {
    return <Navigate to="/auth" replace />;
  }

  if (authLoading) {
    return (
      <UniversalLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center gap-2 text-brand-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading...</span>
          </div>
        </div>
      </UniversalLayout>
    );
  }

  return (
    <UniversalLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="h-8 w-8 text-brand-500" />
            <GraduationCap className="h-8 w-8 text-brand-500" />
            <h1 className="text-3xl font-bebas text-brand-800 tracking-wide">Admin Scholarships</h1>
          </div>
          <p className="text-brand-600 max-w-2xl mx-auto">
            Manage scholarship opportunities from external sources and add local scholarships manually.
          </p>
        </div>

        {/* Scholarship Manager Component */}
        <ScholarshipManager />
      </div>
    </UniversalLayout>
  );
};

export default AdminScholarships;