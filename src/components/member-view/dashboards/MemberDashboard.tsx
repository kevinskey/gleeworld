import { CommunityHubWidget } from "@/components/unified/CommunityHubWidget";
import { ExecBoardMemberModules } from "@/components/executive/ExecBoardMemberModules";
import { MemberModules } from "@/components/member-view/MemberModules";

interface MemberDashboardProps {
  user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
    exec_board_role?: string;
    is_exec_board?: boolean;
    is_admin?: boolean;
    is_super_admin?: boolean;
    created_at: string;
  };
}

export const MemberDashboard = ({ user }: MemberDashboardProps) => {
  // Check if user is executive board based on the user prop, not useUserRole hook
  const isExecutiveBoard = user.is_exec_board || user.is_admin || user.is_super_admin;
  
  return (
    <div className="min-h-screen bg-muted/30 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <CommunityHubWidget />
        
        {/* Executive Board Modules - Show only for exec board members */}
        {isExecutiveBoard ? (
          <ExecBoardMemberModules user={user} />
        ) : (
          // Member suite for non-executive members (role-based permissions)
          <MemberModules user={user} />
        )}
      </div>
    </div>
  );
};
