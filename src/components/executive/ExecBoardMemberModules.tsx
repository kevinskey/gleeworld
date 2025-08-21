
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Crown, Settings, AlertTriangle, RefreshCw } from 'lucide-react';
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

  // Use unified modules with executive position filtering
  const { 
    modules: availableModules, 
    loading, 
    error,
    getAccessibleModules,
    refetch
  } = useUnifiedModules({
    userId: user.id,
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

  const handleRefresh = () => {
    console.log('Refreshing module permissions...');
    refetch();
  };

  const renderModuleComponent = () => {
    if (!selectedModule) return null;
    
    const module = availableModules.find(m => m.id === selectedModule);
    if (!module) return null;

    const Component = module.component;
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

  // Show error state with recovery options
  if (error) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-brand-600" />
            <CardTitle>Executive Board Modules</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Unable to load your modules. This may be a temporary system issue.</span>
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
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
            Your executive board modules are being configured.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <div>
                <p className="font-medium">No modules available</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your module permissions may still be setting up. Try refreshing in a moment.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
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
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-brand-50 text-brand-700 border-brand-200">
              Executive Access
            </Badge>
            <Button variant="ghost" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
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
                      onClick={() => handleModuleClick(module.id)}
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
