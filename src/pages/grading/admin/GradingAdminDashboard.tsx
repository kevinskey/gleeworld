import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Plus, Settings } from 'lucide-react';
import { CreateCourseDialog } from '@/components/grading/admin/CreateCourseDialog';
import { CourseManagementTable } from '@/components/grading/admin/CourseManagementTable';

const GradingAdminDashboard: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useUserRole();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  if (authLoading || profileLoading) {
    return <LoadingSpinner size="lg" text="Loading..." />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Only admins and super admins can access
  const isAdmin = profile?.is_admin || profile?.is_super_admin;
  if (!isAdmin) {
    return <Navigate to="/grading/instructor/dashboard" replace />;
  }

  return (
    <UniversalLayout>
      <div className="container mx-auto py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <Settings className="h-8 w-8" />
              Grading System Administration
            </h1>
            <p className="text-muted-foreground">
              Manage courses, assign instructors, and oversee the grading system
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Course
          </Button>
        </div>

        <CourseManagementTable />

        <CreateCourseDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
        />
      </div>
    </UniversalLayout>
  );
};

export default GradingAdminDashboard;
