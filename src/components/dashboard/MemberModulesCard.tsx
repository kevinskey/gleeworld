import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ModuleRegistry } from "@/utils/moduleRegistry";

interface Module {
  id: string;
  name: string;
  title: string;
  description: string;
  icon: any;
  iconColor: string;
}

export const MemberModulesCard = () => {
  const [memberModules, setMemberModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMemberModules();
  }, []);

  const fetchMemberModules = async () => {
    try {
      setLoading(true);
      
      // Get all users with role 'member'
      const { data: members, error: membersError } = await supabase
        .from('gw_profiles')
        .select('user_id')
        .eq('role', 'member');

      if (membersError) throw membersError;

      if (!members || members.length === 0) {
        setMemberModules([]);
        return;
      }

      const memberIds = members.map(m => m.user_id);

      // Get modules assigned to ALL members
      const { data: permissions, error: permissionsError } = await supabase
        .from('gw_user_module_permissions')
        .select('module_id')
        .in('user_id', memberIds)
        .eq('is_active', true);

      if (permissionsError) throw permissionsError;

      // Count occurrences of each module
      const moduleCounts = new Map<string, number>();
      permissions?.forEach(permission => {
        const count = moduleCounts.get(permission.module_id) || 0;
        moduleCounts.set(permission.module_id, count + 1);
      });

      // Filter modules that are assigned to ALL members
      const universalModuleIds = Array.from(moduleCounts.entries())
        .filter(([_, count]) => count === memberIds.length)
        .map(([moduleId]) => moduleId);

      // Get module details
      const modules = universalModuleIds
        .map(moduleId => {
          const moduleConfig = ModuleRegistry.getModule(moduleId);
          if (!moduleConfig) return null;

          return {
            id: moduleConfig.id,
            name: moduleConfig.title, // Use title as name
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
            Universal Member Modules
          </CardTitle>
          <CardDescription>Modules assigned to all members</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-background/95 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Universal Member Modules
          <Badge variant="secondary" className="ml-2">
            {memberModules.length}
          </Badge>
        </CardTitle>
        <CardDescription>Modules assigned to all members</CardDescription>
      </CardHeader>
      <CardContent>
        {memberModules.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No modules are currently assigned to all members
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {memberModules.map((module) => {
              const IconComponent = module.icon;
              return (
                <div
                  key={module.id}
                  className="flex flex-col items-center gap-2 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  {IconComponent && (
                    <div className={`p-2 rounded-lg bg-${module.iconColor}-100 dark:bg-${module.iconColor}-900/20`}>
                      <IconComponent className={`h-5 w-5 text-${module.iconColor}-600 dark:text-${module.iconColor}-400`} />
                    </div>
                  )}
                  <div className="text-center">
                    <p className="text-xs font-medium line-clamp-2">{module.title}</p>
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
