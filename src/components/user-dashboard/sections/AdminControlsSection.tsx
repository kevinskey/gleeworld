import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EnhancedTooltip } from "@/components/ui/enhanced-tooltip";
import { AdminIconsPanel } from "@/components/admin/AdminIconsPanel";
import { useNavigate } from "react-router-dom";
import { Shield } from "lucide-react";
import { DASHBOARD_MODULES, hasModuleAccess, DashboardModule } from "@/constants/permissions";

interface AdminControlsSectionProps {
  userRole: string;
  userEmail: string;
  usernamePermissions: string[];
  profile: any;
}

export const AdminControlsSection = ({ 
  userRole, 
  userEmail, 
  usernamePermissions, 
  profile 
}: AdminControlsSectionProps) => {
  const navigate = useNavigate();

  const getAvailableModules = () => {
    const modules: Array<{
      key: DashboardModule;
      module: typeof DASHBOARD_MODULES[DashboardModule];
      icon: any;
      source: 'role' | 'username';
    }> = [];

    Object.entries(DASHBOARD_MODULES).forEach(([key, module]) => {
      const moduleKey = key as DashboardModule;
      if (hasModuleAccess(userRole, userEmail, moduleKey, usernamePermissions)) {
        // Determine icon for each module
        let icon = Shield;
        switch (moduleKey) {
          case 'hero_management':
            icon = require("lucide-react").Star;
            break;
          case 'dashboard_settings':
            icon = require("lucide-react").Settings;
            break;
          case 'youtube_management':
            icon = require("lucide-react").Youtube;
            break;
          case 'send_emails':
            icon = require("lucide-react").Mail;
            break;
          case 'manage_permissions':
            icon = Shield;
            break;
        }

        const hasRolePermission = userRole === 'admin' || userRole === 'super-admin';
        const hasUsernamePermission = usernamePermissions.includes(module.permission);
        const source = hasRolePermission ? 'role' : 'username';

        modules.push({ key: moduleKey, module, icon, source });
      }
    });

    return modules;
  };

  const availableModules = getAvailableModules();

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Shield className="h-5 w-5 mr-2 text-blue-600" />
          Admin Controls
          {profile?.role === 'super-admin' && (
            <Badge variant="destructive" className="ml-2 text-xs">Super Admin</Badge>
          )}
        </CardTitle>
        <CardDescription>
          {profile?.role === 'super-admin' 
            ? 'Full system access' 
            : `${availableModules.length} module${availableModules.length !== 1 ? 's' : ''} available`
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Super Admin Alumnae Portal */}
        {profile?.role === 'super-admin' && (
          <div className="mb-4">
            <Button
              className="w-full justify-start h-12 bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700"
              onClick={() => navigate('/admin/alumnae')}
            >
              <div className="h-6 w-6 mr-3 text-yellow-300">
                🎓
              </div>
              <div className="text-left">
                <div className="font-medium">Alumnae Portal Admin</div>
                <div className="text-xs text-purple-100">Manage alumni content & stories</div>
              </div>
            </Button>
          </div>
        )}

        {/* Module Grid */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4">
          {availableModules.slice(0, 8).map((module) => {
            const IconComponent = module.icon;
            return (
              <EnhancedTooltip key={module.key} content={module.module.description}>
                <Button
                  className="h-14 sm:h-16 md:h-20 flex-col space-y-0.5 sm:space-y-1 md:space-y-2 text-xs sm:text-sm w-full relative px-1 sm:px-3"
                  variant="outline"
                  onClick={() => navigate(`/dashboard?module=${module.key.replace(/_/g, '-')}`)}
                >
                  <IconComponent className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                  <span className="text-center leading-tight text-[10px] sm:text-xs md:text-sm">
                    {module.module.name}
                  </span>
                  {module.source === 'username' && (
                    <div className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full" />
                  )}
                </Button>
              </EnhancedTooltip>
            );
          })}
        </div>

        {availableModules.length > 8 && (
          <div className="mt-4 text-center">
            <Button variant="ghost" size="sm" className="text-xs">
              +{availableModules.length - 8} more modules
            </Button>
          </div>
        )}

        {/* Admin Icons Panel */}
        <div className="mt-4">
          <AdminIconsPanel />
        </div>
      </CardContent>
    </Card>
  );
};