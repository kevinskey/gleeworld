import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Crown, Settings } from 'lucide-react';
import { useUnifiedModules } from "@/hooks/useUnifiedModules";
import { UNIFIED_MODULE_CATEGORIES } from "@/config/unified-modules";

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

  console.log('ExecBoardMemberModules - User:', user);
  console.log('ExecBoardMemberModules - user.exec_board_role:', user.exec_board_role);
  console.log('ExecBoardMemberModules - user.is_exec_board:', user.is_exec_board);

  // Use unified modules with executive position filtering
  const { 
    modules: availableModules, 
    loading, 
    error,
    getAccessibleModules 
  } = useUnifiedModules({
    execPosition: user.exec_board_role,
    userRole: user.role,
    isAdmin: user.is_admin || user.is_super_admin
  });

  const accessibleModules = getAccessibleModules();

  const handleModuleClick = (moduleId: string) => {
    console.log('ExecBoardMemberModules - Attempting to access module:', moduleId);
    
    const module = availableModules.find(m => m.id === moduleId);
    console.log('ExecBoardMemberModules - Module found:', !!module, module?.title);
    
    if (module && module.hasPermission) {
      setSelectedModule(moduleId);
      console.log('ExecBoardMemberModules - Successfully loaded module:', moduleId);
    } else {
      console.log('ExecBoardMemberModules - Module not accessible:', moduleId);
    }
  };

  const renderModuleComponent = () => {
    console.log('ExecBoardMemberModules - renderModuleComponent called, selectedModule:', selectedModule);
    if (!selectedModule) return null;
    
    const module = availableModules.find(m => m.id === selectedModule);
    console.log('ExecBoardMemberModules - Module config for selectedModule:', module?.title);
    if (!module) return null;

    const Component = module.component;
    console.log('ExecBoardMemberModules - About to render component:', Component?.name);
    return (
      <div className="mt-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{module.title}</h3>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              console.log('ExecBoardMemberModules - Close button clicked');
              setSelectedModule(null);
            }}
          >
            Close
          </Button>
        </div>
        <Component user={user} />
      </div>
    );
  };

  // Group modules by category
  const modulesByCategory = accessibleModules.reduce((acc, module) => {
    const category = module.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(module);
    return acc;
  }, {} as Record<string, typeof accessibleModules>);

  const getCategoryColor = (category: string) => {
    const colors = {
      'communications': 'blue',
      'finances': 'green',
      'tours': 'purple',
      'attendance': 'orange',
      'musical-leadership': 'indigo',
      'member-management': 'cyan',
      'libraries': 'emerald',
      'system': 'gray'
    };
    return colors[category as keyof typeof colors] || 'gray';
  };

  const getCategoryIcon = (category: string) => {
    const categoryConfig = UNIFIED_MODULE_CATEGORIES.find(c => c.id === category);
    return categoryConfig?.icon;
  };

  if (!user.is_exec_board) {
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

  console.log('ExecBoardMemberModules - Rendering with modules:', accessibleModules.length);

  if (accessibleModules.length === 0) {
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
                Role: {user.exec_board_role} • {accessibleModules.length} modules available
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="bg-brand-50 text-brand-700 border-brand-200">
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
                    {UNIFIED_MODULE_CATEGORIES.find(c => c.id === category)?.title || category}
                  </h4>
                  <div className="flex-1 h-px bg-border" />
                </div>
                
                <div className="grid gap-2">
                  {modules.map((module) => (
                    <Card 
                      key={module.id} 
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => {
                        console.log('Card clicked for module:', module.id);
                        handleModuleClick(module.id);
                      }}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h5 className="font-medium text-sm">{module.title}</h5>
                              <div className="flex gap-1">
                                {module.canAccess && (
                                  <Badge variant="outline" className="text-xs px-1 py-0">
                                    View
                                  </Badge>
                                )}
                                {module.canManage && (
                                  <Badge variant="outline" className="text-xs px-1 py-0 bg-brand-50 border-brand-200">
                                    Manage
                                  </Badge>
                                )}
                              </div>
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