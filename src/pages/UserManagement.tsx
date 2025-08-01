import { useUsers } from "@/hooks/useUsers";
import { useUserProfile } from "@/hooks/useUserProfile";
import { EnhancedUserManagement } from "@/components/admin/user-management/EnhancedUserManagement";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

const UserManagement = () => {
  const { user } = useAuth();
  const { userProfile } = useUserProfile(user);
  const { users, loading: usersLoading, error: usersError, refetch: refetchUsers } = useUsers();

  // Check if user is admin or super admin
  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'super-admin';
  
  console.log('UserManagement page loaded - user:', user?.id, 'isAdmin:', isAdmin, 'userProfile:', userProfile);
  
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

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