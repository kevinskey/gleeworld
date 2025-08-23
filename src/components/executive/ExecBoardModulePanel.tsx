import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crown, Settings, Users, Calendar, MessageSquare, ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from '@/contexts/AuthContext';
import { useSimplifiedModuleAccess } from '@/hooks/useSimplifiedModuleAccess';
import { UNIFIED_MODULES } from '@/config/unified-modules';

export const ExecBoardModulePanel = () => {
  const { user } = useAuth();
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [userModules, setUserModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickAccessCollapsed, setQuickAccessCollapsed] = useState(false);

  const { getAccessibleModules, loading: accessLoading } = useSimplifiedModuleAccess();

  useEffect(() => {
    if (!user) return;
    
    const accessibleModules = getAccessibleModules();
    const moduleIds = accessibleModules.map(module => module.id);
    setUserModules(moduleIds);
    setLoading(false);
  }, [user, getAccessibleModules]);

  const handleModuleClick = (moduleId: string) => {
    if (userModules.includes(moduleId)) {
      setSelectedModule(moduleId);
    }
  };

  const renderModuleComponent = () => {
    if (!selectedModule) return null;
    
    const module = UNIFIED_MODULES.find(m => m.id === selectedModule);
    if (!module) return null;

    const IconComponent = module.icon;
    
    return (
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center gap-3">
            <IconComponent className="h-6 w-6" />
            <div>
              <CardTitle>{module.title}</CardTitle>
              <CardDescription>{module.description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <p>Module details coming soon...</p>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading || accessLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="text-muted-foreground">Loading executive modules...</div>
      </div>
    );
  }

  // Get user's assigned modules with their details
  const assignedModules = UNIFIED_MODULES.filter(module => 
    module.isActive && userModules.includes(module.id)
  );

  // Group modules by category for better organization
  const modulesByCategory = assignedModules.reduce((acc, module) => {
    if (!acc[module.category]) {
      acc[module.category] = [];
    }
    acc[module.category].push(module);
    return acc;
  }, {} as Record<string, typeof assignedModules>);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Executive': return Crown;
      case 'Administrative': return Settings;
      case 'Member Management': return Users;
      case 'Event Planning': return Calendar;
      case 'Communication': return MessageSquare;
      default: return Settings;
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Access Section */}
      <Card>
        <Collapsible open={!quickAccessCollapsed} onOpenChange={setQuickAccessCollapsed}>
          <CollapsibleTrigger asChild>
            <CardHeader className="hover:bg-accent/50 cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-primary" />
                    Quick Access
                  </CardTitle>
                  <CardDescription>
                    Your most important executive modules
                  </CardDescription>
                </div>
                <ChevronRight className={`h-4 w-4 transition-transform ${!quickAccessCollapsed ? 'rotate-90' : ''}`} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {assignedModules
                  .filter(m => ['user-management', 'auditions', 'budgets', 'email-management', 'calendar-management', 'permissions'].includes(m.id))
                  .slice(0, 5)
                  .map((module) => (
                     <Button
                       key={module.id}
                       variant="outline"
                       className="h-[160px] p-6 flex flex-col items-start gap-3 text-left hover:bg-accent"
                       onClick={() => setSelectedModule(module.id)}
                     >
                       <div className="w-full">
                         <h3 className="font-semibold text-base lg:text-lg">{module.title}</h3>
                         <p className="text-sm lg:text-base text-muted-foreground mt-2 line-clamp-2">
                           {module.description}
                         </p>
                       </div>
                     </Button>
                  ))}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Module Categories */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl lg:text-2xl font-semibold">
            Module Access
          </h2>
          <Badge variant="secondary">
            {assignedModules.length} modules available
          </Badge>
        </div>

        {Object.entries(modulesByCategory).map(([category, modules]) => {
          const CategoryIcon = getCategoryIcon(category);
          
          return (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CategoryIcon className="h-5 w-5" />
                  {category}
                </CardTitle>
                <CardDescription>
                  {modules.length} module{modules.length !== 1 ? 's' : ''} in this category
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {modules.map((module) => {
                    const IconComponent = module.icon;
                    const isSelected = selectedModule === module.id;
                    
                    return (
                      <Button
                        key={module.id}
                        variant={isSelected ? "default" : "outline"}
                        className="h-[120px] p-4 flex flex-col items-start gap-2 text-left hover:bg-accent"
                        onClick={() => handleModuleClick(module.id)}
                      >
                        <div className="flex items-start justify-between w-full">
                          <IconComponent className="h-5 w-5 flex-shrink-0" />
                          {module.isNew && (
                            <Badge variant="secondary" className="text-xs">New</Badge>
                          )}
                        </div>
                        <div className="w-full">
                          <h3 className="font-medium text-sm">{module.title}</h3>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {module.description}
                          </p>
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Render selected module */}
      {renderModuleComponent()}

      {assignedModules.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Crown className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Modules Assigned</h3>
            <p className="text-muted-foreground mb-4">
              Contact an administrator to get access to executive modules.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};