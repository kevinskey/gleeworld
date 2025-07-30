import { useParams, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useUserById } from "@/hooks/useUserById";
import { DashboardTemplate } from "./DashboardTemplate";
import { MemberDashboard } from "./dashboards/MemberDashboard";
import { ExecutiveBoardDashboard } from "./dashboards/ExecutiveBoardDashboard";
import { AlumnaeDashboard } from "./dashboards/AlumnaeDashboard";
import { AdminDashboard } from "./dashboards/AdminDashboard";
import { SuperAdminDashboard } from "./dashboards/SuperAdminDashboard";
import { useDashboardSettings } from "@/hooks/useDashboardSettings";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ErrorState } from "@/components/shared/ErrorState";

export const MemberViewDashboard = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { getSettingByName } = useDashboardSettings();
  const { user, loading, error } = useUserById(userId);

  // Redirect to profile page if user exists but member view isn't appropriate
  useEffect(() => {
    if (error === 'User not found') {
      // Try to navigate to profile page instead
      navigate(`/profile`, { replace: true });
    }
  }, [error, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" text="Loading user dashboard..." />
      </div>
    );
  }

  if (error && error !== 'User not found') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <ErrorState
          title="Failed to load user"
          message={error}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">User Not Found</h2>
          <Button onClick={() => navigate('/dashboard')} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const welcomeCardSetting = getSettingByName('welcome_card_background');
  const backgroundImage = welcomeCardSetting?.image_url;

  const renderDashboardContent = () => {
    console.log('MemberViewDashboard: rendering dashboard for user:', user);
    console.log('MemberViewDashboard: user role is:', user.role);
    
    switch (user.role) {
      case 'super-admin':
        console.log('MemberViewDashboard: Loading SuperAdminDashboard');
        return <SuperAdminDashboard user={user} />;
      case 'admin':
        console.log('MemberViewDashboard: Loading AdminDashboard');
        return <AdminDashboard user={user} />;
      case 'alumnae':
        console.log('MemberViewDashboard: Loading AlumnaeDashboard');
        return <AlumnaeDashboard user={user} />;
      case 'user':
        if (user.is_exec_board) {
          console.log('MemberViewDashboard: Loading ExecutiveBoardDashboard');
          return <ExecutiveBoardDashboard user={user} />;
        }
        console.log('MemberViewDashboard: Loading MemberDashboard for user');
        return <MemberDashboard user={user} />;
      default:
        console.log('MemberViewDashboard: Loading default MemberDashboard, role was:', user.role);
        return <MemberDashboard user={user} />;
    }
  };

  const getTitle = () => {
    if (user.is_exec_board && user.exec_board_role) {
      return `${user.exec_board_role} Dashboard`;
    }
    switch (user.role) {
      case 'super-admin':
        return 'Super Admin Dashboard';
      case 'admin':
        return 'Admin Dashboard';
      case 'alumnae':
        return 'Alumnae Dashboard';
      default:
        return 'Member Dashboard';
    }
  };

  const getSubtitle = () => {
    return `Viewing ${user.full_name}'s dashboard perspective`;
  };

  return (
    <DashboardTemplate
      user={user}
      title={getTitle()}
      subtitle={getSubtitle()}
      headerActions={
        <Button onClick={() => navigate('/dashboard')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      }
    >
      {renderDashboardContent()}
    </DashboardTemplate>
  );
};