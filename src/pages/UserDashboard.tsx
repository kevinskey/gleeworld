
import { UserDashboard } from "@/components/user-dashboard/UserDashboard";
import { UserDashboardProvider } from "@/contexts/UserDashboardContext";

const UserDashboardPage = () => {
  return (
    <UserDashboardProvider>
      <UserDashboard />
    </UserDashboardProvider>
  );
};

export default UserDashboardPage;
