import { useExecutiveBoardAccess } from "@/hooks/useExecutiveBoardAccess";
import { Navigate, useNavigate } from "react-router-dom";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { AlumnaeManagementModule } from "@/components/modules/AlumnaeManagementModule";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function AlumnaeManagement() {
  const { canAccessAdminModules, loading } = useExecutiveBoardAccess();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (!canAccessAdminModules) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Button
        variant="ghost"
        onClick={() => navigate('/admin/alumnae')}
        className="gap-2 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Admin
      </Button>
      <AlumnaeManagementModule isFullPage={true} />
    </div>
  );
}
