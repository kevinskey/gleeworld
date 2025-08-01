import { useUsers } from "@/hooks/useUsers";
import { useUserProfile } from "@/hooks/useUserProfile";
import { EnhancedUserManagement } from "@/components/admin/user-management/EnhancedUserManagement";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

const UserManagement = () => {
  const { user, loading: authLoading } = useAuth();
  const { userProfile, loading: profileLoading } = useUserProfile(user);
  const { users, loading: usersLoading, error: usersError, refetch: refetchUsers } = useUsers();

  // Check if user is admin or super admin
  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'super-admin';
  
  console.log('UserManagement page loaded - user:', user?.id, 'isAdmin:', isAdmin, 'userProfile:', userProfile, 'profileLoading:', profileLoading, 'authLoading:', authLoading, 'usersLoading:', usersLoading, 'usersError:', usersError);
  
  // Show loading while auth or profile is loading
  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading user management...</p>
        </div>
      </div>
    );
  }
  
  // Redirect if not admin (only after loading is complete) - TEMPORARILY DISABLED FOR DEBUGGING
  if (!authLoading && !profileLoading && !isAdmin) {
    console.log('UserManagement: Would redirect non-admin user, but debugging...');
    // return <Navigate to="/" replace />;
  }

  console.log('UserManagement: Rendering main content');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-4 p-4 bg-white rounded-lg shadow">
          <h1 className="text-xl font-bold mb-2">User Management Debug</h1>
          <div className="text-sm space-y-1">
            <p>User ID: {user?.id || 'No user'}</p>
            <p>Is Admin: {isAdmin ? 'Yes' : 'No'}</p>
            <p>User Role: {userProfile?.role || 'No role'}</p>
            <p>Auth Loading: {authLoading ? 'Yes' : 'No'}</p>
            <p>Profile Loading: {profileLoading ? 'Yes' : 'No'}</p>
            <p>Users Loading: {usersLoading ? 'Yes' : 'No'}</p>
            <p>Users Count: {users?.length || 0}</p>
            <p>Users Error: {usersError || 'None'}</p>
          </div>
        </div>
        
        {usersError ? (
          <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            <h2 className="font-bold">Error loading users:</h2>
            <p>{usersError}</p>
          </div>
        ) : (
          <EnhancedUserManagement 
            users={users}
            loading={usersLoading}
            error={usersError}
            onRefetch={refetchUsers}
          />
        )}
      </div>
    </div>
  );
};

export default UserManagement;