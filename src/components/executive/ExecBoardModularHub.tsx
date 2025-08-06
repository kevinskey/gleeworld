import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Settings, Crown, Users, Calendar, FileText, MessageSquare, BarChart3, Shield, Bus, Music } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Import executive modules
import { ExecutiveTaskManager } from './modules/ExecutiveTaskManager';
import { ExecutiveCommunications } from './modules/ExecutiveCommunications';
import { ExecutiveReports } from './modules/ExecutiveReports';
import { ExecutiveCalendar } from './modules/ExecutiveCalendar';
import { ExecutiveTeamOverview } from './modules/ExecutiveTeamOverview';
import { ExecutiveToursLogistics } from './modules/ExecutiveToursLogistics';
import { ExecutiveConcertManagement } from './modules/ExecutiveConcertManagement';

interface ExecModule {
  id: string;
  name: string;
  description: string;
  icon: any;
  component: React.ComponentType<any>;
  requiredRole?: string[]; // Specific exec roles that can access this module
  isEnabled: boolean;
  category: 'management' | 'communication' | 'analytics' | 'planning' | 'logistics';
}

interface ExecBoardModularHubProps {
  className?: string;
}

const DEFAULT_MODULES: ExecModule[] = [
  {
    id: 'tours-logistics',
    name: 'Tours & Logistics',
    description: 'Coordinate tours, travel, and concert logistics',
    icon: Bus,
    component: ExecutiveToursLogistics,
    requiredRole: ['tour_manager', 'president', 'vice_president'],
    isEnabled: false,
    category: 'logistics'
  },
  {
    id: 'concert-management',
    name: 'Concert Management',
    description: 'Manage concerts, rehearsals, and performances',
    icon: Music,
    component: ExecutiveConcertManagement,
    requiredRole: ['tour_manager', 'president', 'music_director', 'secretary'],
    isEnabled: false,
    category: 'logistics'
  },
  {
    id: 'task-manager',
    name: 'Task Management',
    description: 'Assign and track executive board tasks',
    icon: FileText,
    component: ExecutiveTaskManager,
    isEnabled: false,
    category: 'management'
  },
  {
    id: 'team-overview',
    name: 'Team Overview',
    description: 'View executive board member status and roles',
    icon: Users,
    component: ExecutiveTeamOverview,
    isEnabled: false,
    category: 'management'
  },
  {
    id: 'communications',
    name: 'Executive Communications',
    description: 'Internal messaging and announcements',
    icon: MessageSquare,
    component: ExecutiveCommunications,
    isEnabled: false,
    category: 'communication'
  },
  {
    id: 'executive-calendar',
    name: 'Executive Calendar',
    description: 'Board meetings and executive events',
    icon: Calendar,
    component: ExecutiveCalendar,
    isEnabled: false,
    category: 'planning'
  },
  {
    id: 'reports-analytics',
    name: 'Reports & Analytics',
    description: 'Executive dashboard metrics and reports',
    icon: BarChart3,
    component: ExecutiveReports,
    requiredRole: ['president', 'secretary', 'treasurer'],
    isEnabled: false,
    category: 'analytics'
  }
];

export const ExecBoardModularHub = ({ className }: ExecBoardModularHubProps) => {
  const { user } = useAuth();
  const { profile } = useUserRole();
  const { toast } = useToast();
  
  const [modules, setModules] = useState<ExecModule[]>(DEFAULT_MODULES);
  const [activeTab, setActiveTab] = useState('overview');
  const [isConfigMode, setIsConfigMode] = useState(false);

  // Check if user is executive board member
  const isExecBoard = profile?.is_exec_board && profile?.verified;
  const execRole = profile?.exec_board_role;

  useEffect(() => {
    if (isExecBoard && user) {
      loadUserModulePreferences();
    }
  }, [isExecBoard, user]);

  const loadUserModulePreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_executive_module_preferences')
        .select('module_id, is_enabled')
        .eq('user_id', user?.id);

      if (error) throw error;

      if (data && data.length > 0) {
        setModules(prevModules => 
          prevModules.map(module => {
            const userPref = data.find(pref => pref.module_id === module.id);
            return userPref ? { ...module, isEnabled: userPref.is_enabled } : module;
          })
        );
      }
    } catch (error) {
      console.error('Error loading module preferences:', error);
    }
  };

  const saveModulePreference = async (moduleId: string, isEnabled: boolean) => {
    try {
      const { error } = await supabase
        .from('gw_executive_module_preferences')
        .upsert({
          user_id: user?.id,
          module_id: moduleId,
          is_enabled: isEnabled,
        });

      if (error) throw error;

      setModules(prevModules =>
        prevModules.map(module =>
          module.id === moduleId ? { ...module, isEnabled } : module
        )
      );

      toast({
        title: "Preferences Updated",
        description: `Module ${isEnabled ? 'enabled' : 'disabled'} successfully`,
      });
    } catch (error) {
      console.error('Error saving module preference:', error);
      toast({
        title: "Error",
        description: "Failed to save module preferences",
        variant: "destructive",
      });
    }
  };

  // Filter modules based on user role and permissions
  const availableModules = modules.filter(module => {
    if (!module.requiredRole) return true;
    return execRole && module.requiredRole.includes(execRole);
  });

  const enabledModules = availableModules.filter(module => module.isEnabled);

  // Group modules by category
  const modulesByCategory = enabledModules.reduce((acc, module) => {
    if (!acc[module.category]) acc[module.category] = [];
    acc[module.category].push(module);
    return acc;
  }, {} as Record<string, ExecModule[]>);

  if (!isExecBoard) {
    return null; // Don't render if not an executive board member
  }

  return (
    <Card className={`bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 border-purple-200 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Crown className="h-6 w-6 text-purple-600" />
            <div>
              <CardTitle className="text-lg">Executive Board Hub</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-purple-700 border-purple-300">
                  {execRole?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {enabledModules.length} modules active
                </Badge>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsConfigMode(!isConfigMode)}
            className="text-purple-600 hover:text-purple-700"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {isConfigMode ? (
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-muted-foreground mb-3">Module Configuration</h3>
            <div className="grid gap-3">
              {availableModules.map((module) => (
                <div key={module.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <module.icon className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium text-sm">{module.name}</div>
                      <div className="text-xs text-muted-foreground">{module.description}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id={module.id}
                      checked={module.isEnabled}
                      onCheckedChange={(checked) => saveModulePreference(module.id, checked)}
                    />
                    <Label htmlFor={module.id} className="text-xs">
                      {module.isEnabled ? 'Enabled' : 'Disabled'}
                    </Label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-6 mb-4">
              <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
              <TabsTrigger value="logistics" className="text-xs">Logistics</TabsTrigger>
              <TabsTrigger value="management" className="text-xs">Manage</TabsTrigger>
              <TabsTrigger value="communication" className="text-xs">Comm</TabsTrigger>
              <TabsTrigger value="planning" className="text-xs">Plan</TabsTrigger>
              <TabsTrigger value="analytics" className="text-xs">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {enabledModules.slice(0, 4).map((module) => {
                  const ModuleComponent = module.component;
                  return (
                    <Card key={module.id} className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <module.icon className="h-4 w-4 text-purple-600" />
                        <h4 className="font-medium text-sm">{module.name}</h4>
                      </div>
                      <ModuleComponent preview={true} execRole={execRole} />
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            {Object.entries(modulesByCategory).map(([category, categoryModules]) => (
              <TabsContent key={category} value={category} className="space-y-4">
                {categoryModules.map((module) => {
                  const ModuleComponent = module.component;
                  return (
                    <Card key={module.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          <module.icon className="h-5 w-5 text-purple-600" />
                          <CardTitle className="text-base">{module.name}</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <ModuleComponent preview={false} execRole={execRole} />
                      </CardContent>
                    </Card>
                  );
                })}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};