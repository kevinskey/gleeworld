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
        <CommunityHubWidget />
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Admin Tools</h2>
          <p>Testing admin tools visibility...</p>
        </div>
        <AdminToolsWidget />
      </div>
    </div>
  );
};