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
  const {
    user
  } = useAuth();
  const {
    profile
  } = useUserRole();
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [userModules, setUserModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDayMode, setIsDayMode] = useState(true);
  const {
    getAccessibleModules,
    loading: accessLoading,
    hasAccess
  } = useSimplifiedModuleAccess(user?.id);
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
    if (hasAccess(moduleId)) {
      setSelectedModule(moduleId);
    }
  };
  const renderModuleComponent = () => {
    if (!selectedModule) return null;
    const module = UNIFIED_MODULES.find(m => m.id === selectedModule);
    if (!module) return null;
    return <div className="mt-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{module.title}</h3>
          <Button variant="outline" size="sm" onClick={() => setSelectedModule(null)}>
            Close
          </Button>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              {React.createElement(module.icon, { className: "w-16 h-16 mx-auto mb-4" })}
              <h3 className="text-lg font-medium mb-2">{module.title}</h3>
              <p>{module.description}</p>
              <p className="text-sm mt-2">Module functionality coming soon...</p>
            </div>
          </CardContent>
        </Card>
      </div>;
  };

  // Get standard member modules
  const getStandardMemberModules = () => {
    return STANDARD_MEMBER_MODULE_IDS.map(moduleId => {
      const module = UNIFIED_MODULES.find(m => m.id === moduleId);
      return module;
    }).filter(Boolean);
  };

  // Get executive modules (assigned modules that aren't standard member modules)
  const assignedModules = getAccessibleModules().filter(module => !STANDARD_MEMBER_MODULE_IDS.includes(module.id));

  // Group executive modules by category
  const execModulesByCategory = assignedModules.reduce((acc, module) => {
    // Create executive-specific category groupings
    let execCategory = 'General Tools';

    // Executive Leadership modules
    if (['attendance-management', 'user-management', 'auditions', 'permissions', 'wardrobe'].includes(module.id)) {
      execCategory = 'Executive Leadership';
    }
    // Communications & Events
    else if (['email-management', 'notifications', 'pr-coordinator', 'scheduling-module', 'service-management', 'calendar-management', 'tour-management', 'booking-forms'].includes(module.id)) {
      execCategory = 'Communications & Events';
    }
    // Musical Direction
    else if (['student-conductor', 'section-leader', 'sight-singing-management', 'librarian', 'radio-management'].includes(module.id)) {
      execCategory = 'Musical Direction';
    }
    // Financial Management
    else if (['contracts', 'budgets', 'receipts-records', 'approval-system', 'glee-ledger', 'monthly-statements', 'check-requests'].includes(module.id)) {
      execCategory = 'Financial Management';
    }
    // Member Engagement
    else if (['buckets-of-love', 'wellness', 'alumnae-portal', 'fan-engagement', 'glee-writing'].includes(module.id)) {
      execCategory = 'Member Engagement';
    }
    // Tools & Administration
    else if (['ai-tools', 'hero-manager', 'press-kits', 'first-year-console', 'settings'].includes(module.id)) {
      execCategory = 'Tools & Administration';
    }
    if (!acc[execCategory]) {
      acc[execCategory] = [];
    }
    acc[execCategory].push(module);
    return acc;
  }, {} as Record<string, typeof assignedModules>);
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Executive Leadership':
        return Users;
      case 'Communications & Events':
        return MessageSquare;
      case 'Musical Direction':
        return Music;
      case 'Financial Management':
        return DollarSign;
      case 'Member Engagement':
        return Heart;
      case 'Tools & Administration':
        return Settings;
      default:
        return Settings;
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
    return <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading modules...</p>
          </div>
        </CardContent>
      </Card>;
  }
  const standardModules = getStandardMemberModules();
  return <div className="w-full overflow-x-hidden page-container">
      <div className="w-full section-spacing">
        {/* Hero Section for Standard Member Modules */}
        <section aria-label="Member modules" className="animate-fade-in w-full overflow-hidden">
          <div className="relative">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-muted/20">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,hsl(var(--primary)/0.1),transparent)]"></div>
            </div>
            
            <Card className="relative border-0 bg-transparent shadow-none">
              <CardContent className="px-6 py-8 md:py-12">
                {/* Header */}
                <div className="text-center mb-8 md:mb-12">
                  <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-primary/10 border border-primary/20 mb-4">
                    <Crown className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium text-primary">Executive Board Dashboard</span>
                  </div>
                  <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                    Welcome to GleeWorld
                  </h1>
                  <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    Access your essential Glee Club tools and executive functions
                  </p>
                </div>

                {/* Module Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 max-w-5xl mx-auto">
                  {standardModules.map(module => {
                    const IconComponent = getModuleIcon(module.id);
                    return (
                      <Card 
                        key={module.id} 
                        className="group cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-background/80 backdrop-blur-sm border-border/50" 
                        onClick={() => handleModuleClick(module.id)}
                      >
                        <CardContent className="p-4 text-center">
                          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/20 transition-colors">
                            <IconComponent className="h-6 w-6 text-primary" />
                          </div>
                          <h3 className="font-semibold text-sm mb-1 text-foreground">{module.title}</h3>
                          <p className="text-xs text-muted-foreground line-clamp-2">{module.description}</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                  <Card 
                    className="group cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-background/80 backdrop-blur-sm border-primary/30 ring-1 ring-primary/20" 
                    onClick={() => handleModuleClick('check-in-check-out')}
                  >
                    <CardContent className="p-4 text-center">
                      <div className="w-12 h-12 rounded-lg bg-primary/15 flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/25 transition-colors">
                        <CheckSquare className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="font-semibold text-sm mb-1 text-foreground">Check In/Out</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">Track attendance</p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Executive Functions Section - Accordion Style */}
        {assignedModules.length > 0 && <section className="mb-6">
            <Accordion type="multiple" className="w-full">
              <AccordionItem value="executive-functions">
                <AccordionTrigger className="text-base">
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-primary" /> 
                    Executive Functions
                    <Badge variant="secondary" className="ml-2">
                      {profile?.exec_board_role || 'Executive'}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <Card>
                    <CardContent className="pt-6 space-y-4">
                      {Object.entries(execModulesByCategory).map(([category, modules]) => {
                    const IconComponent = getCategoryIcon(category);
                    return <div key={category} className="space-y-3">
                        <div className="flex items-center gap-2 mb-3">
                          <IconComponent className="h-4 w-4 text-primary" />
                          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                                {category}
                              </h4>
                              <div className="flex-1 h-px bg-border" />
                            </div>
                            
                            <div className="responsive-grid-2 gap-2">
                              {modules.map(module => <Card key={module.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleModuleClick(module.id)}>
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
                                </Card>)}
                            </div>
                          </div>;
                  })}
                    </CardContent>
                  </Card>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </section>}


        {renderModuleComponent()}

        {/* No executive modules assigned state */}
        {!loading && assignedModules.length === 0 && <Card className="border-muted">
            <CardContent className="text-center py-12">
              <Crown className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Executive Functions Assigned</h3>
              <p className="text-muted-foreground mb-4">
                You have access to all standard member modules above.
              </p>
              <p className="text-sm text-muted-foreground">
                Contact an administrator to request executive module access.
              </p>
            </CardContent>
          </Card>}
      </div>
    </div>;
};