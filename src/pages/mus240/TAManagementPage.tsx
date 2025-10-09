import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { TAManagement } from '@/components/mus240/admin/TAManagement';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export const TAManagementPage = () => {
  const { isAdmin, isSuperAdmin, loading } = useUserRole();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Only admins and super admins can manage TAs
  if (!isAdmin() && !isSuperAdmin()) {
    return <Navigate to="/classes/mus240" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link
          to="/classes/mus240"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to MUS 240
        </Link>
        
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Teaching Assistant Management</h1>
          <p className="text-muted-foreground">
            Manage teaching assistants for MUS 240. TAs can edit assignments and listening journals, 
            and provide feedback to students, but cannot assign or modify grades.
          </p>
        </div>

        <TAManagement />
      </div>
    </div>
  );
};
