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
      <Card className="border-0 bg-white shadow-none">
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-2 px-4 cursor-pointer transition-colors py-4" style={{ background: 'hsl(208, 100%, 33%)' }}>
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg font-semibold tracking-wide text-white">MY MODULES</CardTitle>
                <span className="text-xs text-white/70">
                  ({modulesWithDetails.length + (showAdminSettings ? 1 : 0)})
                </span>
              </div>
              <div className="flex items-center gap-2">
                {userProfile.exec_board_role && <span className="text-xs text-white bg-white/20 px-2 py-1 rounded">
                    {userProfile.exec_board_role}
                  </span>}
                <ChevronDown className={`h-4 w-4 text-white transition-transform duration-200 mr-5 ${isOpen ? 'rotate-180' : ''}`} />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent style={{ background: 'hsl(208, 100%, 25%)' }} className="px-4 pb-4 py-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-3">
              {modulesWithDetails.map(module => {
              const IconComponent = getIconComponent(module.icon);
              return <Button key={module.id} variant="ghost" onClick={() => navigate(module.route)} 
                style={{ background: 'hsl(208, 100%, 33%)' }}
                className="h-[100px] py-3 px-2 flex flex-col items-center justify-center gap-2 border border-white/20 hover:bg-[hsl(208,100%,40%)] hover:border-white/40">
                    <div className="flex-shrink-0">
                      <IconComponent className="h-7 w-7 text-white" />
                    </div>
                    <span className="text-[10px] text-center leading-tight line-clamp-2 text-white px-0.5 font-medium break-words w-full sm:text-xs">
                      {module.title}
                    </span>
                  </Button>;
            })}
              {showAdminSettings && <Button variant="ghost" 
                style={{ background: 'hsl(208, 100%, 33%)' }}
                className="h-[100px] py-4 px-3 flex flex-col items-center justify-start gap-3 border border-white/20 hover:bg-[hsl(208,100%,40%)] hover:border-white/40" 
                onClick={() => navigate('/dashboard?module=admin-settings')}>
                  <div className="flex-shrink-0 mt-2">
                    <Settings className="h-8 w-8 text-white" />
                  </div>
                  <span className="text-sm text-center leading-tight font-medium text-white">Admin Settings</span>
                </Button>}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>;
};