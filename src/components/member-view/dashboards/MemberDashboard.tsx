import { CommunityHubWidget } from "@/components/unified/CommunityHubWidget";
import { ExecBoardModulePanel } from "@/components/executive/ExecBoardModulePanel";

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
  const isExecBoard = user.is_exec_board;
  
  return (
    <div className="min-h-screen bg-muted/30 p-6 -m-6">
      <div className="space-y-6">
        <CommunityHubWidget />
        
        {isExecBoard && (
          <div className="flex justify-center">
            <ExecBoardModulePanel userEmail={user.email} className="w-full max-w-md" />
          </div>
        )}
      </div>
    </div>
  );
};
