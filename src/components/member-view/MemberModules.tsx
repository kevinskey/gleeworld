import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Users } from 'lucide-react';
import { useUnifiedModules } from "@/hooks/useUnifiedModules";
import { UNIFIED_MODULE_CATEGORIES } from "@/config/unified-modules";

interface MemberModulesProps {
  user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
    is_admin?: boolean;
    is_super_admin?: boolean;
  };
}

export const MemberModules: React.FC<MemberModulesProps> = ({ user }) => {
  const [selectedModule, setSelectedModule] = useState<string | null>(null);

  // Use unified modules with role-based filtering (no executive position)
  const { modules: availableModules, loading, getAccessibleModules } = useUnifiedModules({
    userRole: user.role,
    isAdmin: user.is_admin || user.is_super_admin,
  });

  const accessibleModules = getAccessibleModules();

  const handleModuleClick = (moduleId: string) => {
    const module = availableModules.find(m => m.id === moduleId);
    if (module && module.hasPermission) {
      setSelectedModule(moduleId);
    }
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
          <Button variant="outline" size="sm" onClick={() => setSelectedModule(null)}>
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
    if (!acc[category]) acc[category] = [];
    acc[category].push(module);
    return acc;
  }, {} as Record<string, typeof accessibleModules>);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Loading your modules...</span>
      </div>
    );
  }

  if (accessibleModules.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-brand-600" />
            <CardTitle>Member Tools</CardTitle>
          </div>
          <CardDescription>
            No modules are enabled for your role yet.
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
            <Users className="h-5 w-5 text-brand-600" />
            <div>
              <CardTitle>Member Tools</CardTitle>
              <CardDescription>
                {accessibleModules.length} modules available for your role
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="bg-brand-50 text-brand-700 border-brand-200">
            Member Access
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Object.entries(modulesByCategory).map(([category, modules]) => {
            const IconComponent = UNIFIED_MODULE_CATEGORIES.find(c => c.id === category)?.icon;
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
                      className="cursor-pointer bg-card hover:bg-accent/10 border border-border transition-colors"
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
