import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Crown, Settings, Users, Calendar, MessageSquare, Music, Home, CheckSquare, Sparkles, DollarSign, Heart, Sun, Moon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useSimplifiedModuleAccess } from '@/hooks/useSimplifiedModuleAccess';
import { UNIFIED_MODULES } from '@/config/unified-modules';
import { STANDARD_MEMBER_MODULE_IDS } from '@/config/executive-modules';

export const ExecBoardModulePanel = () => {
  const { user } = useAuth();
  const { profile } = useUserRole();
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [userModules, setUserModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDayMode, setIsDayMode] = useState(true);

  const { getAccessibleModules, loading: accessLoading, hasAccess } = useSimplifiedModuleAccess(user?.id);

  useEffect(() => {
    console.log('🔍 ExecBoardModulePanel: useEffect triggered');
    console.log('🔍 User:', user?.email);
    console.log('🔍 Access Loading state:', accessLoading);
    console.log('🔍 Has access function:', typeof hasAccess);
    
    if (!user || accessLoading) {
      console.log('🔍 ExecBoardModulePanel: Waiting for user or access loading...');
      return;
    }
    
    console.log('🎯 ExecBoardModulePanel: Fetching accessible modules for user:', user.id);
    const accessibleModules = getAccessibleModules();
    console.log('🎯 ExecBoardModulePanel: Accessible modules:', accessibleModules.map(m => `${m.id} (${m.title})`));
    const moduleIds = accessibleModules.map(module => module.id);
    console.log('🎯 ExecBoardModulePanel: Module IDs:', moduleIds);
    setUserModules(moduleIds);
    setLoading(false);
  }, [user?.id, accessLoading]);

  const handleModuleClick = (moduleId: string) => {
    console.log('🎯 Module clicked:', moduleId);
    console.log('🎯 Has access:', hasAccess(moduleId));
    console.log('🎯 Current selectedModule:', selectedModule);
    
    if (hasAccess(moduleId)) {
      console.log('🎯 Setting selectedModule to:', moduleId);
      setSelectedModule(moduleId);
    } else {
      console.log('🎯 No access to module:', moduleId);
    }
  };

  const renderModuleComponent = () => {
    console.log('🔍 renderModuleComponent called, selectedModule:', selectedModule);
    
    if (!selectedModule) {
      console.log('🔍 No selectedModule, returning null');
      return null;
    }
    
    const module = UNIFIED_MODULES.find(m => m.id === selectedModule);
    console.log('🔍 Found module:', module);
    
    if (!module) {
      console.log('🔍 Module not found in UNIFIED_MODULES');
      return null;
    }

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
        <div className="min-h-[400px]">
          {module.component ? (
            <module.component />
          ) : (
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
          )}
        </div>
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

  // Removed unnecessary executive module categorization - modules not needed

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Executive Leadership': return Users;
      case 'Communications & Events': return MessageSquare;
      case 'Musical Direction': return Music;
      case 'Financial Management': return DollarSign;
      case 'Member Engagement': return Heart;
      case 'Tools & Administration': return Settings;
      default: return Settings;
    }
  };

  const getModuleIcon = (moduleId: string) => {
    const icons = {
      'community-hub': Home,
      'music-library': Music,
      'calendar': Calendar,
      'attendance': CheckSquare,
      'check-in-check-out': CheckSquare
    };
    return icons[moduleId as keyof typeof icons] || Home;
  };

  if (loading || accessLoading) {
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

  const standardModules = getStandardMemberModules();

  return (
    <div className="w-full overflow-x-hidden page-container">
      <div className="w-full section-spacing">
        {/* Hero Section for Standard Member Modules */}
        <section aria-label="Member modules" className="animate-fade-in w-full overflow-hidden">
          <Card className="relative overflow-hidden border bg-background/40 w-full">
            {/* Day/Night Toggle */}
            <Button
              variant="outline"
              size="sm"
              className="absolute top-4 right-4 z-20 bg-background/80 backdrop-blur-sm"
              onClick={() => setIsDayMode(!isDayMode)}
            >
              {isDayMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>
            
            <div className="absolute inset-0">
              <img
                src="/lovable-uploads/7f76a692-7ffc-414c-af69-fc6585338524.png"
                alt="Historic Spelman campus background"
                className={`w-full h-full object-cover transition-all duration-700 ${
                  isDayMode 
                    ? 'brightness-125 contrast-110 saturate-110' 
                    : 'brightness-50 contrast-125 saturate-75 hue-rotate-180 sepia-[0.3]'
                }`}
              />
              <div className={`absolute inset-0 transition-all duration-700 ${
                isDayMode 
                  ? 'bg-gradient-to-b from-background/10 via-background/15 to-background/30'
                  : 'bg-gradient-to-b from-blue-950/40 via-blue-900/50 to-blue-950/70'
              }`} />
            </div>
            <CardContent className="card-compact relative z-10 h-[320px] sm:h-[360px] md:h-[400px] flex flex-col justify-between pt-8">
              <div className="flex items-center gap-2 md:gap-4 pt-5">
                <div className="bg-blue-900/90 rounded-lg p-4 flex items-center gap-2 md:gap-4">
                  <Sparkles className="h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 text-white drop-shadow-lg" />
                  <div>
                    <h1 className="mobile-text-2xl font-bold tracking-tight text-white drop-shadow-lg">EXEC BOARD DASHBOARD</h1>
                    <p className="mobile-text-lg text-white/80 drop-shadow-md">Your core Glee Club modules</p>
                  </div>
                </div>
              </div>

              <div className="w-full responsive-grid-2 gap-2 md:gap-4">
                <div className="grid grid-cols-2 gap-2">
                  {standardModules.slice(0, 4).map((module) => {
                    const IconComponent = getModuleIcon(module.id);
                    return (
                      <Card 
                        key={module.id} 
                        className="cursor-pointer hover:bg-muted/70 hover:scale-105 hover:shadow-lg transition-all duration-200 bg-background/60 backdrop-blur-sm border-2 hover:border-primary/50 active:scale-95 h-20 flex items-center justify-center"
                        onClick={() => handleModuleClick(module.id)}
                      >
                        <div className="flex flex-col items-center justify-center gap-1 text-center w-full">
                          <IconComponent className="h-5 w-5 text-primary transition-colors" />
                          <span className="text-xs font-medium transition-colors leading-tight">{module.title}</span>
                        </div>
                      </Card>
                    );
                  })}
                </div>
                
                {standardModules.length > 4 && (
                  <Card className="bg-background/60 backdrop-blur-sm h-20">
                    <CardContent className="p-4 h-full flex items-center justify-center">
                      <div className="text-center flex flex-col items-center justify-center h-full">
                        <Music className="h-6 w-6 text-primary mb-1" />
                        <h3 className="font-medium text-xs mb-0">Additional Modules</h3>
                        <p className="text-xs text-muted-foreground">
                          {standardModules.length - 4} more available
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Executive Functions Section - Removed - Not necessary */}

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