import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { PRCoordinatorHub } from "@/components/pr-coordinator/PRCoordinatorHub";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Navigate } from "react-router-dom";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Camera, Sparkles, Shield } from "lucide-react";

const PRHubPage = () => {
  console.log('PRHubPage: Component is being rendered');
  const { user } = useAuth();
  const { userProfile, loading } = useUserProfile(user);

  console.log('PRHubPage: Current state', { user: !!user, userProfile, loading });

  if (loading) {
    console.log('PRHubPage: Still loading profile...');
    return (
      <UniversalLayout>
        <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 flex items-center justify-center">
          <div className="bg-card/80 backdrop-blur-sm p-8 rounded-lg border border-border shadow-lg">
            <LoadingSpinner size="lg" text="Loading PR Hub..." />
          </div>
        </div>
      </UniversalLayout>
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
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
        <div className="container mx-auto px-4 py-8">
          {/* Hero Header */}
          <div className="mb-8">
            <div className="bg-gradient-to-r from-primary to-secondary/80 rounded-xl p-8 text-white shadow-xl border border-primary/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                    <Camera className="w-10 h-10 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="text-4xl font-bold">PR Hub</h1>
                      <Sparkles className="w-6 h-6 text-secondary" />
                    </div>
                    <p className="text-white/90 text-lg max-w-2xl">
                      Professional media management and publicity coordination for the Spelman College Glee Club
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <Shield className="w-4 h-4 text-secondary" />
                      <span className="text-sm text-white/80">
                        {isPRCoordinator ? 'PR Coordinator Access' : 'Administrative Access'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="hidden lg:block">
                  <div className="w-32 h-32 bg-gradient-to-br from-secondary to-accent rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-3xl">PR</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="bg-card/60 backdrop-blur-sm rounded-xl border border-border shadow-lg overflow-hidden">
            <PRCoordinatorHub />
          </div>
        </div>
      </div>
    </UniversalLayout>
  );
};

export default PRHubPage;