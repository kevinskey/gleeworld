import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { UnifiedUserManagement } from '@/components/admin/UnifiedUserManagement';
import { Loader2 } from 'lucide-react';

const AdminUsers = () => {
  const { user, loading: authLoading } = useAuth();

  // Redirect to auth if not logged in
  if (!authLoading && !user) {
    return <Navigate to="/auth" replace />;
  }

  // Check if user is admin
  if (!authLoading && user && user.role !== 'admin' && user.role !== 'super-admin') {
    return <Navigate to="/dashboard" replace />;
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
      <div className="px-4 md:px-0">
        <UnifiedUserManagement />
      </div>
    </UniversalLayout>
  );
};

export default AdminUsers;