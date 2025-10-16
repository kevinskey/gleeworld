import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Crown, Settings, Users, Calendar, MessageSquare, Music, Home, CheckSquare, Sparkles } from 'lucide-react';
import { useSimplifiedModuleAccess } from '@/hooks/useSimplifiedModuleAccess';
import { UNIFIED_MODULES } from '@/config/unified-modules';
import { STANDARD_MEMBER_MODULE_IDS } from '@/config/executive-modules';

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

  // Get standard member modules
  const getStandardMemberModules = () => {
    return STANDARD_MEMBER_MODULE_IDS.map(moduleId => {
      const module = UNIFIED_MODULES.find(m => m.id === moduleId);
      return module;
    }).filter(Boolean);
  };

  // Get executive modules (assigned modules)
  const assignedModules = getAccessibleModules();

  // Group executive modules by category
  const execModulesByCategory = assignedModules.reduce((acc, module) => {
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

  const getModuleIcon = (moduleId: string) => {
    const icons = {
      'community-hub': Home,
      'music-library': Music,
      'calendar': Calendar,
      'attendance': CheckSquare
    };
    return icons[moduleId as keyof typeof icons] || Home;
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

  const standardModules = getStandardMemberModules();

  return (
    <div className="w-full overflow-x-hidden page-container">
      <div className="w-full section-spacing">
        {/* Hero Section for Standard Member Modules */}
        <section aria-label="Member modules" className="animate-fade-in w-full overflow-hidden">
          <Card className="relative overflow-hidden border bg-background/40 w-full">
            <div className="absolute inset-0">
              <img
                src="/lovable-uploads/7f76a692-7ffc-414c-af69-fc6585338524.png"
                alt="Historic Spelman campus background"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/40 to-background/70" />
            </div>
            <CardContent className="card-compact relative z-10 h-[320px] sm:h-[360px] md:h-[400px] flex flex-col justify-between">
              <div className="flex items-center gap-2 md:gap-4">
                <Sparkles className="h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 text-primary" />
                <div>
                  <h1 className="mobile-text-2xl font-bold tracking-tight">Member Dashboard</h1>
                  <p className="mobile-text-lg text-muted-foreground">Your core Glee Club modules</p>
                </div>
              </div>

              <div className="w-full responsive-grid-2 gap-2 md:gap-4">
                <div className="grid grid-cols-2 gap-2">
                  {standardModules.slice(0, 4).map((module) => {
                    const IconComponent = getModuleIcon(module.id);
                    return (
                      <Card 
                        key={module.id} 
                        className="cursor-pointer hover:bg-muted/50 transition-colors bg-background/60 backdrop-blur-sm"
                        onClick={() => handleModuleClick(module.id)}
                      >
                        <CardContent className="p-3">
                          <div className="flex flex-col items-center text-center gap-2">
                            <IconComponent className="h-6 w-6 text-primary" />
                            <span className="text-xs font-medium">{module.title}</span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
                
                {standardModules.length > 4 && (
                  <Card className="bg-background/60 backdrop-blur-sm">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <Music className="h-8 w-8 text-primary mx-auto mb-2" />
                        <h3 className="font-medium text-sm mb-1">Additional Modules</h3>
                        <p className="text-xs text-muted-foreground">
                          {standardModules.length - 4} more modules available
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Executive Functions Section - Accordion Style */}
        {assignedModules.length > 0 && (
          <section className="mb-6">
            <Accordion type="multiple" className="w-full">
              <AccordionItem value="executive-functions">
                <AccordionTrigger className="text-base">
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-primary" /> 
                    Executive Functions
                    <Badge variant="secondary" className="ml-2">
                      {user.exec_board_role}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <Card>
                    <CardContent className="pt-6 space-y-4">
                      {Object.entries(execModulesByCategory).map(([category, modules]) => {
                        const IconComponent = getCategoryIcon(category);
                        
                        return (
                          <div key={category} className="space-y-3">
                            <div className="flex items-center gap-2 mb-3">
                              {IconComponent && <IconComponent className="h-4 w-4" />}
                              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                                {category}
                              </h4>
                              <div className="flex-1 h-px bg-border" />
                            </div>
                            
                            <div className="responsive-grid-2 gap-2">
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
                                            Executive
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
                    </CardContent>
                  </Card>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </section>
        )}

        {/* All Modules in Accordion Style */}
        <section>
          <Accordion type="multiple" className="w-full">
            {/* Standard Member Modules */}
            <AccordionItem value="member-modules">
              <AccordionTrigger className="text-base">
                <div className="flex items-center gap-2">
                  <Home className="h-4 w-4 text-primary" /> 
                  Member Modules
                  <Badge variant="outline" className="ml-2">
                    {standardModules.length} modules
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <Card>
                  <CardContent className="pt-6">
                    <div className="responsive-grid-3 gap-3">
                      {standardModules.map((module) => {
                        const IconComponent = getModuleIcon(module.id);
                        return (
                          <Card 
                            key={module.id} 
                            className="cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => handleModuleClick(module.id)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center gap-3">
                                <IconComponent className="h-8 w-8 text-primary flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <h5 className="font-medium text-sm">{module.title}</h5>
                                  <p className="text-xs text-muted-foreground line-clamp-2">
                                    {module.description}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        {renderModuleComponent()}
      </div>
    </div>
  );
};