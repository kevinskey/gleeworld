import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LayoutGrid, Settings, Loader2 } from 'lucide-react';
import { useSimplifiedModuleAccess } from '@/hooks/useSimplifiedModuleAccess';
import { UNIFIED_MODULES } from '@/config/unified-modules';
import * as Icons from 'lucide-react';

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

// Helper to get icon component from string name or LucideIcon
const getIconComponent = (iconName: string | Icons.LucideIcon) => {
  if (typeof iconName === 'function') {
    return iconName;
  }
  const IconComponent = (Icons as any)[iconName];
  return IconComponent || Icons.LayoutGrid;
};

export const MyModules = ({ userProfile }: MyModulesProps) => {
  const navigate = useNavigate();
  const { getAccessibleModules, loading } = useSimplifiedModuleAccess(userProfile.user_id);
  
  const accessibleModules = getAccessibleModules();
  const isSuperAdmin = userProfile.is_super_admin || userProfile.is_admin;

  // For super admins, show all modules; for others, show up to 12
  const modulesWithDetails = accessibleModules
    .map(module => {
      const unifiedModule = UNIFIED_MODULES.find(u => u.id === module.id);
      return {
        id: module.id,
        title: unifiedModule?.title || module.title || module.id,
        icon: unifiedModule?.icon || 'LayoutGrid',
        iconColor: unifiedModule?.iconColor || 'blue',
        route: `/dashboard?module=${module.id}`
      };
    })
    .slice(0, isSuperAdmin ? 100 : 12); // Super admins see all, others see max 12

  // Admin always gets admin settings
  const showAdminSettings = userProfile.is_admin || userProfile.is_super_admin;

  if (loading) {
    return (
      <Card className="border border-border bg-card">
        <CardHeader className="pb-2 px-4">
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-semibold">My Modules</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (modulesWithDetails.length === 0 && !showAdminSettings) {
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
          {modulesWithDetails.map((module) => {
            const IconComponent = getIconComponent(module.icon);
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
          {showAdminSettings && (
            <Button
              variant="outline"
              className="h-auto py-3 flex flex-col items-center gap-2 hover:bg-primary/10 hover:border-primary/30"
              onClick={() => navigate('/dashboard?module=admin-settings')}
            >
              <Settings className="h-5 w-5 text-primary" />
              <span className="text-xs text-center leading-tight">Admin Settings</span>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
