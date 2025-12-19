import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LayoutGrid, ArrowRight, Briefcase, Calendar, Users, FileText, Settings } from 'lucide-react';

interface MyModulesProps {
  userProfile: {
    user_id: string;
    role?: string;
    exec_board_role?: string | null;
    is_exec_board?: boolean;
    is_admin?: boolean;
    is_super_admin?: boolean;
  };
}

// Define assigned modules based on exec board role
const getExecBoardModules = (role: string | null | undefined) => {
  const modules: { id: string; title: string; icon: any; route: string }[] = [];
  
  if (!role) return modules;

  const roleModules: Record<string, { id: string; title: string; icon: any; route: string }[]> = {
    'President': [
      { id: 'exec-overview', title: 'Executive Overview', icon: Briefcase, route: '/dashboard?module=exec-overview' },
      { id: 'approvals', title: 'Approvals', icon: FileText, route: '/dashboard?module=approvals' },
    ],
    'Vice President': [
      { id: 'event-planning', title: 'Event Planning', icon: Calendar, route: '/dashboard?module=event-planning' },
    ],
    'Secretary': [
      { id: 'attendance', title: 'Attendance', icon: Users, route: '/dashboard?module=attendance' },
      { id: 'meeting-minutes', title: 'Meeting Minutes', icon: FileText, route: '/dashboard?module=meeting-minutes' },
    ],
    'Treasurer': [
      { id: 'budget', title: 'Budget Management', icon: Briefcase, route: '/dashboard?module=budget' },
    ],
    'Chaplain': [
      { id: 'chaplain', title: 'Chaplain Dashboard', icon: Users, route: '/dashboard?module=chaplain' },
    ],
    'Historian': [
      { id: 'media-library', title: 'Media Library', icon: LayoutGrid, route: '/dashboard?module=media-library' },
    ],
    'Social Chair': [
      { id: 'social-events', title: 'Social Events', icon: Calendar, route: '/dashboard?module=social-events' },
    ],
  };

  return roleModules[role] || [];
};

export const MyModules = ({ userProfile }: MyModulesProps) => {
  const navigate = useNavigate();
  
  // Get exec board modules if user has an exec role
  const execModules = getExecBoardModules(userProfile.exec_board_role);
  
  // Admin gets admin settings module
  const adminModules = (userProfile.is_admin || userProfile.is_super_admin) ? [
    { id: 'admin-settings', title: 'Admin Settings', icon: Settings, route: '/dashboard?module=admin-settings' },
  ] : [];

  const allModules = [...execModules, ...adminModules];

  if (allModules.length === 0) {
    return null; // Don't render if no assigned modules
  }

  return (
    <Card className="border border-border bg-card">
      <CardHeader className="pb-2 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-semibold">My Modules</CardTitle>
          </div>
          {userProfile.exec_board_role && (
            <span className="text-xs text-muted-foreground bg-primary/10 px-2 py-1 rounded">
              {userProfile.exec_board_role}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {allModules.map((module) => {
            const IconComponent = module.icon;
            return (
              <Button
                key={module.id}
                variant="outline"
                className="h-auto py-3 flex flex-col items-center gap-2 hover:bg-primary/10 hover:border-primary/30"
                onClick={() => navigate(module.route)}
              >
                <IconComponent className="h-5 w-5 text-primary" />
                <span className="text-xs text-center leading-tight">{module.title}</span>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
