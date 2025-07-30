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

  // Check if user has PR access (PR coordinator or admin)
  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'super-admin';
  const isPRCoordinator = userProfile?.exec_board_role === 'pr_coordinator';
  const canAccessPR = isAdmin || isPRCoordinator;

  if (!canAccessPR) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <UniversalLayout>
      <PRCoordinatorHub />
    </UniversalLayout>
  );
};

export default PRHubPage;