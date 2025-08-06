import { CommunityHubWidget } from "@/components/unified/CommunityHubWidget";
import { ExecBoardModulePanel } from "@/components/executive/ExecBoardModulePanel";
import { ExecutiveToursLogistics } from "@/components/executive/modules/ExecutiveToursLogistics";

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
  const isHonesty = user.email === 'onnestypeele@spelman.edu';
  
  return (
    <div className="min-h-screen bg-muted/30 p-6 -m-6">
      <div className="space-y-6">
        <CommunityHubWidget />
        
        {isHonesty && (
          <>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-brand-800 tracking-wide">ADMIN DASHBOARD</h2>
              <p className="text-sm text-muted-foreground">Tours and Concert Logistics</p>
            </div>
            <div className="bg-background border rounded-lg p-6">
              <ExecutiveToursLogistics />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
