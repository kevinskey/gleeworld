import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ModuleRegistry } from "@/utils/moduleRegistry";
import { STANDARD_MEMBER_MODULE_IDS } from "@/config/executive-modules";
import { useNavigate, useLocation } from "react-router-dom";

interface Module {
  id: string;
  name: string;
  title: string;
  description: string;
  icon: any;
  iconColor: string;
}

interface MemberModulesCardProps {
  userId: string;
}

export const MemberModulesCard = ({ userId }: MemberModulesCardProps) => {
  const [memberModules, setMemberModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchMemberModules();
  }, [userId]);

  const fetchMemberModules = async () => {
    try {
      setLoading(true);
      
      if (!userId) {
        setMemberModules([]);
        return;
      }
      
      // Get modules assigned to THIS user that are member modules
      const { data: permissions, error: permissionsError } = await supabase
        .from('gw_user_module_permissions')
        .select('module_id')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (permissionsError) throw permissionsError;

      if (!permissions || permissions.length === 0) {
        setMemberModules([]);
        return;
      }

      // Map all assigned modules for this user
      const modules = permissions
        .map(permission => {
          const moduleConfig = ModuleRegistry.getModule(permission.module_id);
          if (!moduleConfig) return null;

          return {
            id: moduleConfig.id,
            name: moduleConfig.title,
            title: moduleConfig.title,
            description: moduleConfig.description,
            icon: moduleConfig.icon || Settings,
            iconColor: moduleConfig.iconColor || 'blue'
          };
        })
        .filter(Boolean) as Module[];

      setMemberModules(modules);
    } catch (error) {
      console.error('Error fetching member modules:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-background/95 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            My Member Modules
          </CardTitle>
          <CardDescription>Modules assigned to you</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-background/95 backdrop-blur-sm w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          My Member Modules
          <Badge variant="secondary" className="ml-2">
            {memberModules.length}
          </Badge>
        </CardTitle>
        <CardDescription>Modules assigned to you</CardDescription>
      </CardHeader>
      <CardContent>
        {memberModules.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No member modules are currently assigned to you
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {memberModules.map((module) => {
              const IconComponent = module.icon;
              return (
                <div
                  key={module.id}
                  role="button"
                  onClick={() => {
                    const params = new URLSearchParams(location.search);
                    params.set('module', module.id);
                    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
                  }}
                  className="flex flex-col items-center gap-2 p-3 rounded-lg border bg-card text-card-foreground hover:bg-accent/50 transition-colors cursor-pointer"
                >
                  {IconComponent && (
                    <div className={`p-2 rounded-lg bg-${module.iconColor}-100 dark:bg-${module.iconColor}-900/20`}>
                      <IconComponent className={`h-5 w-5 text-${module.iconColor}-600 dark:text-${module.iconColor}-400`} />
                    </div>
                  )}
                  <div className="text-center">
                    <p className="text-xs font-medium line-clamp-2 text-card-foreground">{module.title}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
