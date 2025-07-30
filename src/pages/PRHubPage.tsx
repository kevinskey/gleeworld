import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { PRCoordinatorHub } from "@/components/pr-coordinator/PRCoordinatorHub";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Navigate } from "react-router-dom";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";

const PRHubPage = () => {
  const { user } = useAuth();
  const { userProfile, loading } = useUserProfile(user);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading PR Hub..." />
      </div>
    );
  }

  console.log('PRHubPage - userProfile:', userProfile);
  console.log('PRHubPage - role:', userProfile?.role);
  console.log('PRHubPage - exec_board_role:', userProfile?.exec_board_role);
  console.log('PRHubPage - is_admin:', userProfile?.is_admin);
  console.log('PRHubPage - is_super_admin:', userProfile?.is_super_admin);

  // Check if user has PR access (PR coordinator or admin)
  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'super-admin' || userProfile?.is_admin || userProfile?.is_super_admin;
  const isPRCoordinator = userProfile?.exec_board_role === 'pr_coordinator';
  const canAccessPR = isAdmin || isPRCoordinator;

  console.log('PRHubPage - isAdmin:', isAdmin);
  console.log('PRHubPage - isPRCoordinator:', isPRCoordinator);
  console.log('PRHubPage - canAccessPR:', canAccessPR);

  // Temporarily bypass access control for debugging
  // if (!canAccessPR) {
  //   console.log('PRHubPage - Redirecting to dashboard due to no access');
  //   return <Navigate to="/dashboard" replace />;
  // }

  return (
    <UniversalLayout>
      <div>
        <h1>PR Hub Debug</h1>
        <p>User Profile: {JSON.stringify(userProfile)}</p>
        <p>Can Access PR: {canAccessPR.toString()}</p>
        <PRCoordinatorHub />
      </div>
    </UniversalLayout>
  );
};

export default PRHubPage;