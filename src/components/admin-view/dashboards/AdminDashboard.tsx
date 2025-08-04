import { CommunityHubWidget } from "@/components/unified/CommunityHubWidget";
import { AdminToolsWidget } from "@/components/unified/AdminToolsWidget";

interface AdminDashboardProps {
  user: {
    id: string;
    email?: string;
    full_name?: string;
    role?: string;
    exec_board_role?: string;
    is_exec_board?: boolean;
    created_at?: string;
  };
}

export const AdminDashboard = ({ user }: AdminDashboardProps) => {
  return (
    <div className="min-h-screen bg-muted/30 p-6 -m-6">
      <div className="space-y-6">
        <AdminToolsWidget />
      </div>
    </div>
  );
};