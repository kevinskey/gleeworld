import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crown, Settings, Users, Calendar, MessageSquare } from 'lucide-react';
import { useSimplifiedModuleAccess } from '@/hooks/useSimplifiedModuleAccess';
import { UNIFIED_MODULES } from '@/config/unified-modules';

interface ExecBoardMemberModulesProps {
  user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
    exec_board_role?: string;
    is_exec_board?: boolean;
    is_admin?: boolean;
    is_super_admin?: boolean;
  };
}

export const ExecBoardMemberModules = ({ user }: ExecBoardMemberModulesProps) => {
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const { getAccessibleModules, loading, hasAccess } = useSimplifiedModuleAccess(user.id);

  const handleModuleClick = (moduleId: string) => {
    if (hasAccess(moduleId)) {
      setSelectedModule(moduleId);
    }
  };

  const renderModuleComponent = () => {
    if (!selectedModule) return null;
    
    const module = UNIFIED_MODULES.find(m => m.id === selectedModule);
    if (!module) return null;

    return (
      <div className="mt-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{module.title}</h3>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setSelectedModule(null)}
          >
            Close
          </Button>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <module.icon className="w-16 h-16 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">{module.title}</h3>
              <p>{module.description}</p>
              <p className="text-sm mt-2">Module functionality coming soon...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const assignedModules = getAccessibleModules();

  // Group modules by category
  const modulesByCategory = assignedModules.reduce((acc, module) => {
    const category = module.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(module);
    return acc;
  }, {} as Record<string, typeof assignedModules>);

  const getCategoryIcon = (category: string) => {
    const icons = {
      'member-management': Users,
      'scheduling': Calendar,
      'communications': MessageSquare,
      'finances': Settings,
      'administration': Settings
    };
    return icons[category as keyof typeof icons] || Settings;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading modules...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Super admins can always see executive board modules, regular users need exec board status
  if (!user.is_exec_board && !user.is_super_admin && !user.is_admin) {
    return null;
  }

  if (assignedModules.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            <CardTitle>Executive Board Modules</CardTitle>
          </div>
          <CardDescription>
            No modules have been assigned to this user yet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">Contact an administrator to request module access.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Executive Board Modules</CardTitle>
              <CardDescription>
                Role: {user.exec_board_role} • {assignedModules.length} modules assigned
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary">
            Executive Access
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
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
                    <Card 
                      key={module.id} 
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleModuleClick(module.id)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h5 className="font-medium text-sm">{module.title}</h5>
                              <Badge variant="outline" className="text-xs px-1 py-0">
                                Access
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {module.description}
                            </p>
                          </div>
                          <Settings className="h-3 w-3 ml-2 opacity-50" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        
        {renderModuleComponent()}
      </CardContent>
    </Card>
  );
};