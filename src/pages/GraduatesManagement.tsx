import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { GraduatesManagementModule } from "@/components/modules/GraduatesManagementModule";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { UniversalLayout } from "@/components/layout/UniversalLayout";

export default function GraduatesManagement() {
  const { user, loading: authLoading } = useAuth();
  const { userProfile, loading: profileLoading } = useUserProfile(user);
  const navigate = useNavigate();

  if (authLoading || profileLoading) {
    return (
      <UniversalLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner />
        </div>
      </UniversalLayout>
    );
  }

  const isAdmin = userProfile?.is_admin || userProfile?.is_super_admin || userProfile?.role === 'admin' || userProfile?.role === 'super-admin';
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <UniversalLayout>
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/admin/graduates')}
          className="gap-2 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Admin
        </Button>
        <GraduatesManagementModule isFullPage={true} />
      </div>
    </UniversalLayout>
  );
}
