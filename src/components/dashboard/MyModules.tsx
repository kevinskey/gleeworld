import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { LayoutGrid, Settings, Loader2, ChevronDown } from 'lucide-react';
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
export const MyModules = ({
  userProfile
}: MyModulesProps) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);
  const {
    getAccessibleModules,
    loading
  } = useSimplifiedModuleAccess(userProfile.user_id);
  const accessibleModules = getAccessibleModules();
  const isSuperAdmin = userProfile.is_super_admin || userProfile.is_admin;

  // For super admins, show all modules; for others, show up to 12
  const modulesWithDetails = accessibleModules.map(module => {
    const unifiedModule = UNIFIED_MODULES.find(u => u.id === module.id);
    return {
      id: module.id,
      title: unifiedModule?.title || module.title || module.id,
      icon: unifiedModule?.icon || 'LayoutGrid',
      iconColor: unifiedModule?.iconColor || 'blue',
      route: `/dashboard?module=${module.id}`
    };
  }).slice(0, isSuperAdmin ? 100 : 12); // Super admins see all, others see max 12

  // Admin always gets admin settings
  const showAdminSettings = userProfile.is_admin || userProfile.is_super_admin;
  if (loading) {
    return <Card className="border border-border bg-card">
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
      </Card>;
  }
  if (modulesWithDetails.length === 0 && !showAdminSettings) {
    return null; // Don't render if no assigned modules
  }
  return <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border border-border bg-card">
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-2 px-4 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between pr-0 pl-[20px] py-[20px]">
              <div className="flex items-center gap-2">
                <LayoutGrid className="text-primary pl-[2px] bg-secondary-foreground pr-0 h-[20px] w-[20px]" />
                <CardTitle className="text-lg font-semibold tracking-wide">MY MODULES</CardTitle>
                <span className="text-xs text-muted-foreground">
                  ({modulesWithDetails.length + (showAdminSettings ? 1 : 0)})
                </span>
              </div>
              <div className="flex items-center gap-2">
                {userProfile.exec_board_role && <span className="text-xs text-muted-foreground bg-primary/10 px-2 py-1 rounded">
                    {userProfile.exec_board_role}
                  </span>}
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="px-4 pb-4 py-[15px] bg-background">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-3">
              {modulesWithDetails.map(module => {
              const IconComponent = getIconComponent(module.icon);
              return <Button key={module.id} variant="outline" onClick={() => navigate(module.route)} className="h-[100px] py-3 px-2 flex flex-col items-center justify-start gap-2 bg-card border-border hover:bg-muted/50 hover:border-primary/30">
                    <div className="flex-shrink-0 mt-2">
                      <IconComponent className="h-7 w-7 text-primary" />
                    </div>
                    <span className="text-[10px] text-center leading-tight line-clamp-2 text-foreground px-0.5 font-medium break-words w-full sm:text-sm">
                      {module.title}
                    </span>
                  </Button>;
            })}
              {showAdminSettings && <Button variant="outline" className="h-[100px] py-4 px-3 flex flex-col items-center justify-start gap-3 hover:bg-primary/10 hover:border-primary/30" onClick={() => navigate('/dashboard?module=admin-settings')}>
                  <div className="flex-shrink-0 mt-2">
                    <Settings className="h-8 w-8 text-primary" />
                  </div>
                  <span className="text-sm text-center leading-tight font-medium">Admin Settings</span>
                </Button>}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>;
};