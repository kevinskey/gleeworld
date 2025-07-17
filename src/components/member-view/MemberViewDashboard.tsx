import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { mockUsers } from "@/utils/mockUsers";
import { DashboardTemplate } from "./DashboardTemplate";
import { MemberDashboard } from "./dashboards/MemberDashboard";
import { ExecutiveBoardDashboard } from "./dashboards/ExecutiveBoardDashboard";
import { AlumnaeDashboard } from "./dashboards/AlumnaeDashboard";
import { AdminDashboard } from "./dashboards/AdminDashboard";
import { SuperAdminDashboard } from "./dashboards/SuperAdminDashboard";
import { useDashboardSettings } from "@/hooks/useDashboardSettings";

export const MemberViewDashboard = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { getSettingByName } = useDashboardSettings();

  const user = mockUsers.find(u => u.id === userId);
  
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
    switch (user.role) {
      case 'super-admin':
        return <SuperAdminDashboard user={user} />;
      case 'admin':
        return <AdminDashboard user={user} />;
      case 'alumnae':
        return <AlumnaeDashboard user={user} />;
      case 'user':
        if (user.is_exec_board) {
          return <ExecutiveBoardDashboard user={user} />;
        }
        return <MemberDashboard user={user} />;
      default:
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
      backgroundImage={backgroundImage}
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