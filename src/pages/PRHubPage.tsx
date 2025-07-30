import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { PRCoordinatorHub } from "@/components/pr-coordinator/PRCoordinatorHub";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Navigate } from "react-router-dom";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";

const PRHubPage = () => {
  console.log('PRHubPage: Component is being rendered');
  const { user } = useAuth();
  const { userProfile, loading } = useUserProfile(user);

  console.log('PRHubPage: Current state', { user: !!user, userProfile, loading });

  if (loading) {
    console.log('PRHubPage: Still loading profile...');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading PR Hub..." />
      </div>
    );
  }

  // Check if user has PR access (PR coordinator or admin)
  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'super-admin' || userProfile?.is_admin || userProfile?.is_super_admin;
  const isPRCoordinator = userProfile?.exec_board_role === 'pr_coordinator';
  const canAccessPR = isAdmin || isPRCoordinator;

  console.log('PRHubPage: Access check details', { 
    isAdmin, 
    isPRCoordinator, 
    canAccessPR, 
    userProfileRole: userProfile?.role,
    userProfileIsAdmin: userProfile?.is_admin,
    userProfileIsSuperAdmin: userProfile?.is_super_admin,
    userProfileExecRole: userProfile?.exec_board_role,
    fullUserProfile: userProfile
  });

  // Temporarily disable access control for debugging
  console.log('PRHubPage: Rendering PR Hub (access control disabled for debugging)');

  return (
    <UniversalLayout>
      <PRCoordinatorHub />
    </UniversalLayout>
  );
};

export default PRHubPage;