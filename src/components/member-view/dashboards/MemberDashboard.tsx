import { CommunityHubWidget } from "@/components/unified/CommunityHubWidget";

interface MemberDashboardProps {
  user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
    exec_board_role?: string;
    is_exec_board?: boolean;
    created_at: string;
  };
}

export const MemberDashboard = ({ user }: MemberDashboardProps) => {
  return (
    <div className="min-h-screen bg-muted/30 p-6 -m-6">
      <CommunityHubWidget />
    </div>
  );
};
