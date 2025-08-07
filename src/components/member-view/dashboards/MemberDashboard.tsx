import { CommunityHubWidget } from "@/components/unified/CommunityHubWidget";
import { ExecBoardMemberModules } from "@/components/executive/ExecBoardMemberModules";
import { useUserRole } from "@/hooks/useUserRole";

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
  const { isExecutiveBoard } = useUserRole();
  
  return (
    <div className="min-h-screen bg-muted/30 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <CommunityHubWidget />
        
        {/* Executive Board Modules - Show only for exec board members */}
        {isExecutiveBoard() && (
          <ExecBoardMemberModules user={user} />
        )}
      </div>
    </div>
  );
};
