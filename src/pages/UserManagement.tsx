import { useUsers } from "@/hooks/useUsers";
import { useUserProfile } from "@/hooks/useUserProfile";
import { EnhancedUserManagement } from "@/components/admin/user-management/EnhancedUserManagement";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

const UserManagement = () => {
  console.log('UserManagement: Component starting to load...');
  const { user, loading: authLoading } = useAuth();
  const { userProfile, loading: profileLoading } = useUserProfile(user);
  const { users, loading: usersLoading, error: usersError, refetch: refetchUsers } = useUsers();

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

  // Check if user is admin or super admin with more robust logic
  const isAdmin = !!(userProfile?.is_admin || 
                     userProfile?.is_super_admin || 
                     userProfile?.role === 'admin' || 
                     userProfile?.role === 'super-admin');
  
  console.log('UserManagement page loaded - user:', user?.id, 'isAdmin:', isAdmin, 'userProfile:', userProfile, 'profileLoading:', profileLoading, 'authLoading:', authLoading, 'usersLoading:', usersLoading, 'usersError:', usersError);
  console.log('UserManagement: Admin check details - userProfile?.role:', userProfile?.role, 'userProfile?.is_admin:', userProfile?.is_admin, 'userProfile?.is_super_admin:', userProfile?.is_super_admin, 'isAdmin calculation:', isAdmin, 'authLoading:', authLoading, 'profileLoading:', profileLoading);
  
  // Show loading while auth or profile is loading, OR while we have a user but no profile yet
  if (authLoading || profileLoading || (user && !userProfile)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading user management...</p>
        </div>
      </div>
    );
  }
  
  // Redirect if not admin (only after loading is complete)
  if (!authLoading && !profileLoading && !isAdmin) {
    console.log('UserManagement: Redirecting non-admin user');
    return <Navigate to="/" replace />;
  }

  console.log('UserManagement: Rendering main content');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <EnhancedUserManagement 
          users={users}
          loading={usersLoading}
          error={usersError}
          onRefetch={refetchUsers}
        />
      </div>
    </div>
  );
};

export default UserManagement;