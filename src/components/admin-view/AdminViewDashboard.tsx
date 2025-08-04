import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { DashboardTemplate } from "./DashboardTemplate";
import { AdminDashboard } from "./dashboards/AdminDashboard";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ErrorState } from "@/components/shared/ErrorState";

export const AdminViewDashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect if not admin
  useEffect(() => {
    if (!loading && user && user.role !== 'admin' && user.role !== 'super-admin') {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" text="Loading admin dashboard..." />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <ErrorState
          title="Authentication Required"
          message="Please sign in to access the admin dashboard"
          onRetry={() => navigate('/auth')}
        />
      </div>
    );
  }

  if (user.role !== 'admin' && user.role !== 'super-admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p className="text-muted-foreground mb-4">You don't have permission to access the admin dashboard.</p>
          <Button onClick={() => navigate('/dashboard')} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Use admin background
  const backgroundImage = "/lovable-uploads/7f76a692-7ffc-414c-af69-fc6585338524.png";

  const getTitle = () => {
    return user.role === 'super-admin' ? 'Super Admin Dashboard' : 'Admin Dashboard';
  };

  const getSubtitle = () => {
    return 'Manage the Spelman College Glee Club platform';
  };

  return (
    <DashboardTemplate
      user={user}
      title={getTitle()}
      subtitle={getSubtitle()}
      backgroundImage={backgroundImage}
      headerActions={
        <Button onClick={() => navigate('/dashboard')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      }
    >
      <AdminDashboard user={user} />
    </DashboardTemplate>
  );
};