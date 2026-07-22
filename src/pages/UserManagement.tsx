import { useState } from "react";
import { useUsers } from "@/hooks/useUsers";
import { useUserProfile } from "@/hooks/useUserProfile";
import { EnhancedUserManagement } from "@/components/admin/user-management/EnhancedUserManagement";
import { RosterImport } from "@/components/admin/RosterImport";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Users, FileSpreadsheet } from "lucide-react";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

const UserManagement = () => {
  console.log('UserManagement: Component starting to load...');
  const { user, loading: authLoading } = useAuth();
  const { userProfile, loading: profileLoading } = useUserProfile(user);
  const { users, loading: usersLoading, error: usersError, refetch: refetchUsers } = useUsers();
  const [showRosterImport, setShowRosterImport] = useState(false);

  // Enhanced debugging
  console.log('UserManagement DEBUG - Current state:', {
    user: user?.id,
    userEmail: user?.email,
    authLoading,
    profileLoading,
    usersLoading,
    userProfile,
    usersError,
    usersCount: users?.length
  });

  // Check if user can access user management (admin, super admin, OR executive board)
  const canAccessUserManagement = !!(
    userProfile?.is_admin ||
    userProfile?.is_super_admin ||
    userProfile?.is_exec_board ||
    userProfile?.role === 'admin' ||
    userProfile?.role === 'super-admin'
  );

  console.log('UserManagement page loaded - user:', user?.id, 'canAccessUserManagement:', canAccessUserManagement, 'userProfile:', userProfile);
  console.log('UserManagement: Access check details - is_admin:', userProfile?.is_admin, 'is_super_admin:', userProfile?.is_super_admin, 'is_exec_board:', userProfile?.is_exec_board);

  // Show loading while auth or profile is loading, OR while we have a user but no profile yet
  if (authLoading || profileLoading || (user && !userProfile)) {
    return (
      <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading user management...</p>
          </div>
        </div>
      </DashboardShell>
    </UniversalLayout>
    );
  }

  // Redirect if user cannot access (only after loading is complete)
  if (!authLoading && !profileLoading && !canAccessUserManagement) {
    console.log('UserManagement: Redirecting user without access');
    return <Navigate to="/" replace />;
  }

  console.log('UserManagement: Rendering main content');

  return (
    <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell>
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
          <div className="flex items-center gap-2 text-slate-600">
            <Users className="h-5 w-5" />
            <h1 className="text-xl font-semibold">User Management</h1>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowRosterImport(true)}>
            <FileSpreadsheet className="h-4 w-4" />
            Import Roster (CSV)
          </Button>
        </div>

        <EnhancedUserManagement
          users={users}
          loading={usersLoading}
          error={usersError}
          onRefetch={refetchUsers}
        />
      </div>

      <RosterImport open={showRosterImport} onOpenChange={setShowRosterImport} onImported={refetchUsers} />
    </DashboardShell>
    </UniversalLayout>
  );
};

export default UserManagement;
