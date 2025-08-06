import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Crown, Settings } from 'lucide-react';
import { useUserRole } from "@/hooks/useUserRole";
import { ModuleRegistry } from "@/utils/moduleRegistry";
import { moduleCategories } from "@/config/modules";

interface ExecBoardMemberModulesProps {
  user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
    exec_board_role?: string;
    is_exec_board?: boolean;
  };
}

interface ExecModulePermission {
  function_id: string;
  function_name: string;
  function_description: string;
  function_category: string;
  module: string;
  can_access: boolean;
  can_manage: boolean;
}

export const ExecBoardMemberModules = ({ user }: ExecBoardMemberModulesProps) => {
  const { toast } = useToast();
  const { profile, isExecutiveBoard } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [execModules, setExecModules] = useState<ExecModulePermission[]>([]);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);

  console.log('ExecBoardMemberModules - User:', user);
  console.log('ExecBoardMemberModules - Profile:', profile);
  console.log('ExecBoardMemberModules - isExecutiveBoard():', isExecutiveBoard());
  console.log('ExecBoardMemberModules - exec_board_role:', profile?.exec_board_role);

  useEffect(() => {
    console.log('ExecBoardMemberModules - useEffect triggered');
    if (isExecutiveBoard() && profile?.exec_board_role) {
      console.log('ExecBoardMemberModules - Fetching permissions for:', profile.exec_board_role);
      fetchExecModulePermissions();
    } else {
      console.log('ExecBoardMemberModules - No executive board access, stopping loading');
      setLoading(false);
    }
  }, [profile?.exec_board_role, isExecutiveBoard]);

  const fetchExecModulePermissions = async () => {
    if (!profile?.exec_board_role) {
      console.log('ExecBoardMemberModules - No exec_board_role found');
      return;
    }

    try {
      setLoading(true);
      console.log('ExecBoardMemberModules - Fetching for position:', profile.exec_board_role);
      
      // First, let's get all active functions for this position
      const { data: positionFunctions, error: positionError } = await supabase
        .from('gw_executive_position_functions')
        .select('function_id, can_access, can_manage')
        .eq('position', profile.exec_board_role as any);

      console.log('ExecBoardMemberModules - Position functions result:', positionFunctions);
      console.log('ExecBoardMemberModules - Position functions error:', positionError);

      if (positionError) throw positionError;

      if (!positionFunctions || positionFunctions.length === 0) {
        console.log('ExecBoardMemberModules - No position functions found');
        setExecModules([]);
        return;
      }

      // Get the function IDs that this position has access to
      const accessibleFunctionIds = positionFunctions
        .filter(pf => pf.can_access || pf.can_manage)
        .map(pf => pf.function_id);

      console.log('ExecBoardMemberModules - Accessible function IDs:', accessibleFunctionIds);

      if (accessibleFunctionIds.length === 0) {
        console.log('ExecBoardMemberModules - No accessible functions found');
        setExecModules([]);
        return;
      }

      // Now get the function details
      const { data: functions, error: functionsError } = await supabase
        .from('gw_app_functions')
        .select('id, name, description, category, module')
        .in('id', accessibleFunctionIds)
        .eq('is_active', true);

      console.log('ExecBoardMemberModules - Functions result:', functions);
      console.log('ExecBoardMemberModules - Functions error:', functionsError);

      if (functionsError) throw functionsError;

      // Combine the data
      const modules = functions?.map(func => {
        const permission = positionFunctions.find(pf => pf.function_id === func.id);
        return {
          function_id: func.id,
          function_name: func.name,
          function_description: func.description,
          function_category: func.category,
          module: func.module,
          can_access: permission?.can_access || false,
          can_manage: permission?.can_manage || false
        };
      }) || [];

      console.log('ExecBoardMemberModules - Final modules:', modules);
      console.log('ExecBoardMemberModules - Loaded modules count:', modules.length);
      setExecModules(modules);
    } catch (error) {
      console.error('ExecBoardMemberModules - Error fetching exec module permissions:', error);
      toast({
        title: "Error",
        description: "Failed to load executive modules",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleModuleClick = (moduleId: string) => {
    console.log('ExecBoardMemberModules - Attempting to access module:', moduleId);
    
    // Map database module names to actual module IDs in the registry
    const moduleMapping: Record<string, string> = {
      'core': 'user-management',
      'member': 'user-management', 
      'events': 'calendar-management',
      'communications': 'notifications',
      'notifications': 'notifications',
      'email-management': 'email-management',
      'pr-coordinator': 'pr-coordinator',
      'media': 'pr-coordinator',
      'finance': 'budgets',
      'contracts': 'contracts',
      'auditions': 'auditions',
      'records': 'user-management',
      'booking-forms': 'booking-forms',
      'tour-management': 'tour-management'
    };
    
    const mappedModuleId = moduleMapping[moduleId] || moduleId;
    console.log('ExecBoardMemberModules - Mapped module ID:', mappedModuleId);
    
    const moduleConfig = ModuleRegistry.getModule(mappedModuleId);
    if (moduleConfig) {
      setSelectedModule(mappedModuleId);
      console.log('ExecBoardMemberModules - Successfully loaded module:', mappedModuleId);
    } else {
      console.log('ExecBoardMemberModules - Module not found in registry:', mappedModuleId);
      toast({
        title: "Module Unavailable",
        description: `This module (${moduleId}) is not yet implemented`,
        variant: "destructive",
      });
    }
  };

  const renderModuleComponent = () => {
    if (!selectedModule) return null;
    
    const moduleConfig = ModuleRegistry.getModule(selectedModule);
    if (!moduleConfig) return null;

    const Component = moduleConfig.component;
    return (
      <div className="mt-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{moduleConfig.title}</h3>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setSelectedModule(null)}
          >
            Close
          </Button>
        </div>
        <Component user={user} />
      </div>
    );
  };

  // Group modules by category
  const modulesByCategory = execModules.reduce((acc, module) => {
    const category = module.function_category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(module);
    return acc;
  }, {} as Record<string, ExecModulePermission[]>);

  const getCategoryColor = (category: string) => {
    const colors = {
      'Communications': 'blue',
      'Financial': 'green',
      'Tours': 'purple',
      'Attendance': 'orange',
      'Musical': 'indigo',
      'Other': 'gray'
    };
    return colors[category] || 'gray';
  };

  const getCategoryIcon = (category: string) => {
    const categoryConfig = moduleCategories.find(c => 
      c.title.toLowerCase().includes(category.toLowerCase())
    );
    return categoryConfig?.icon;
  };

  if (!isExecutiveBoard()) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Loading executive modules...</span>
      </div>
    );
    }

    console.log('ExecBoardMemberModules - Rendering with modules:', execModules.length);

    if (execModules.length === 0) {
      console.log('ExecBoardMemberModules - No modules found');
      return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-brand-600" />
            <CardTitle>Executive Board Modules</CardTitle>
          </div>
          <CardDescription>
            No modules have been assigned to your executive position yet.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-brand-600" />
            <div>
              <CardTitle>Executive Board Modules</CardTitle>
              <CardDescription>
                Role: {profile?.exec_board_role} • {execModules.length} modules available
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="bg-brand-50 text-brand-700 border-brand-200">
            Executive Access
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-4">
            {Object.entries(modulesByCategory).map(([category, modules]) => {
              const IconComponent = getCategoryIcon(category);
              
              return (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-3">
                    {IconComponent && <IconComponent className="h-4 w-4" />}
                    <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                      {category}
                    </h4>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  
                  <div className="grid gap-2">
                    {modules.map((module) => (
                      <Card key={module.function_id} className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h5 className="font-medium text-sm">{module.function_name}</h5>
                                <div className="flex gap-1">
                                  {module.can_access && (
                                    <Badge variant="outline" className="text-xs px-1 py-0">
                                      View
                                    </Badge>
                                  )}
                                  {module.can_manage && (
                                    <Badge variant="outline" className="text-xs px-1 py-0 bg-brand-50 border-brand-200">
                                      Manage
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {module.function_description}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 ml-2"
                              onClick={() => handleModuleClick(module.module)}
                            >
                              <Settings className="h-3 w-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
        
        {renderModuleComponent()}
      </CardContent>
    </Card>
  );
};