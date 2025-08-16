import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Users } from 'lucide-react';
import { useUnifiedModules } from "@/hooks/useUnifiedModules";
import { UNIFIED_MODULE_CATEGORIES } from "@/config/unified-modules";

// Import all available module components for mapping
import { MusicLibraryInlineModule } from '@/components/modules/MusicLibraryInlineModule';
import { MusicLibraryModule } from '@/components/modules/MusicLibraryModule';
import { UserManagementModule } from '@/components/modules/UserManagementModule';
import { WardrobeModule } from '@/components/modules/WardrobeModule';
import { AuditionsModule } from '@/components/modules/AuditionsModule';
import { PermissionsModule } from '@/components/modules/PermissionsModule';
import { AttendanceModule } from '@/components/modules/AttendanceModule';
import { SightSingingPreviewModule } from '@/components/modules/SightSingingPreviewModule';
import { SettingsModule } from '@/components/dashboard/modules/SettingsModule';
import { BookingFormsModule } from '@/components/modules/BookingFormsModule';
import { ApprovalSystemModule } from '@/components/modules/ApprovalSystemModule';
import { BucketsOfLoveModule } from '@/components/modules/BucketsOfLoveModule';
import { BudgetsModule } from '@/components/modules/BudgetsModule';
import { CalendarManagementModule } from '@/components/modules/CalendarManagementModule';
import { ContractsModule } from '@/components/modules/ContractsModule';
import { DuesCollectionModule } from '@/components/modules/DuesCollectionModule';
import { EmailManagementModule } from '@/components/modules/EmailManagementModule';
import { EventPlannerModule } from '@/components/modules/EventPlannerModule';
import { KaraokeModule } from '@/components/modules/KaraokeModule';
import { NotificationsModule } from '@/components/modules/NotificationsModule';
import { PRHubModule } from '@/components/modules/PRHubModule';
import { FanEngagementModule } from '@/components/modules/FanEngagementModule';
import { SchedulingModule } from '@/components/modules/SchedulingModule';
import { SectionLeaderModule } from '@/components/modules/SectionLeaderModule';
import { AIFinancialPlanningModule } from '@/components/financial/AIFinancialPlanningModule';
import AlumnaeLanding from '@/pages/AlumnaeLanding';
import { AlumnaePortalModule } from '@/components/modules/AlumnaePortalModule';
import { GleeLedgerModule } from '@/components/admin/financial/GleeLedgerModule';
import { GleeWritingWidget } from '@/components/writing/GleeWritingWidget';
import { RadioManagement } from '@/components/admin/RadioManagement';
import { ReceiptsModule } from '@/components/receipts/ReceiptsModule';
import { ReimbursementsManager } from '@/components/reimbursements/ReimbursementsManager';
import ServiceManagement from '@/components/admin/ServiceManagement';
import { StudentConductorModule } from '@/components/modules/StudentConductorModule';
import { WellnessModule } from '@/components/modules/WellnessModule';
import { MonthlyStatements } from '@/components/admin/financial/MonthlyStatements';
import { PressKitManager } from '@/components/pr-coordinator/PressKitManager';
import MediaLibrary from '@/pages/admin/MediaLibrary';
import { ExecutiveBoardNavigationHub } from '@/components/executive-board/ExecutiveBoardNavigationHub';
import { MediaLibrary as MediaLibraryComponent } from '@/components/radio/MediaLibrary';
import { HeroManagement } from '@/components/admin/HeroManagement';

interface MemberModulesProps {
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

// Map module names to their React components
const getModuleComponent = (moduleName: string) => {
  const componentMap: Record<string, React.ComponentType<any>> = {
    // Core modules
    'music-library': MusicLibraryInlineModule,
    'music-library-module': MusicLibraryModule,
    'user-management': UserManagementModule,
    'wardrobe': WardrobeModule,
    'auditions': AuditionsModule,
    'permissions': PermissionsModule,
    'attendance': AttendanceModule,
    'sight-reading-preview': SightSingingPreviewModule,
    'sight-reading-generator': SightSingingPreviewModule,
    'settings': SettingsModule,
    'booking-forms': BookingFormsModule,
    
    // Extended modules
    'ai-financial': AIFinancialPlanningModule,
    'alumnae-portal': AlumnaePortalModule,
    'approval-system': ApprovalSystemModule,
    'buckets-of-love': BucketsOfLoveModule,
    'budgets': BudgetsModule,
    'calendar-management': CalendarManagementModule,
    'contracts': ContractsModule,
    'dues-collection': DuesCollectionModule,
    'email-management': EmailManagementModule,
    'event-planner': EventPlannerModule,
    'karaoke': KaraokeModule,
    'notifications': NotificationsModule,
    'pr-hub': PRHubModule,
    'fan-engagement': FanEngagementModule,
    'fans': FanEngagementModule,
    'scheduling': SchedulingModule,
    'section-leader': SectionLeaderModule,
    
    // Legacy/alternative naming patterns
    'auditions-management': AuditionsModule,
    'wardrobe-management': WardrobeModule,
    'permissions-management': PermissionsModule,
    'attendance-management': AttendanceModule,
    'user-management-module': UserManagementModule,
    'event-management': EventPlannerModule,
    'calendar': CalendarManagementModule,
    'budget-management': BudgetsModule,
    'contract-management': ContractsModule,
    'dues': DuesCollectionModule,
    'email': EmailManagementModule,
    'public-relations': PRHubModule,
    'pr': PRHubModule,
    
    // Additional missing modules
    'glee-ledger': GleeLedgerModule,
    'glee-writing': GleeWritingWidget,
    'radio-management': RadioManagement,
    'receipts-records': ReceiptsModule,
    'check-requests': ReimbursementsManager,
    'service-management': ServiceManagement,
    'student-conductor': StudentConductorModule,
    'wellness': WellnessModule,
    'monthly-statements': MonthlyStatements,
    'press-kits': PressKitManager,
    'media-library': MediaLibrary,
    'executive-board': ExecutiveBoardNavigationHub,
    'executive-functions': ExecutiveBoardNavigationHub,
    'internal-communications': EmailManagementModule,
    'merch-store': PRHubModule, // Placeholder - needs actual component
    'tour-management': EventPlannerModule, // Placeholder
    'ai-tools': AIFinancialPlanningModule, // Reuse for now
    'hero-manager': HeroManagement, // Fixed to use proper HeroManagement component
    'pr-manager': PRHubModule,
    'sight-reading': SightSingingPreviewModule,
    'pr-coordinator': PRHubModule,
  };
  
  return componentMap[moduleName] || (() => (
    <div className="p-8 text-center">
      <h3 className="text-lg font-semibold mb-2">Module: {moduleName}</h3>
      <p className="text-muted-foreground">Component not yet implemented</p>
      <p className="text-xs text-muted-foreground mt-2">Available components need to be mapped for: {moduleName}</p>
    </div>
  ));
};

export const MemberModules: React.FC<MemberModulesProps> = ({ user }) => {
  const [selectedModule, setSelectedModule] = useState<string | null>(null);

  // Use unified modules with role-based filtering and executive position
  const { modules: availableModules, loading, getAccessibleModules } = useUnifiedModules({
    userId: user.id, // Pass the user ID so permissions can be fetched
    userRole: user.role,
    execPosition: user.exec_board_role,
    isAdmin: user.is_admin || user.is_super_admin,
  });

  const accessibleModules = getAccessibleModules();

  const handleModuleClick = (moduleId: string) => {
    const module = availableModules.find(m => m.id === moduleId);
    
    if (module && module.hasPermission && module.hasPermission('view')) {
      // Toggle behavior: if same module is clicked, close it
      if (selectedModule === moduleId) {
        setSelectedModule(null);
      } else {
        setSelectedModule(moduleId);
      }
    }
  };

  const renderModuleComponent = () => {
    if (!selectedModule) return null;
    
    const module = availableModules.find(m => m.id === selectedModule);
    if (!module) return null;
    
    // Get the component using the module name mapping
    const Component = getModuleComponent(module.name);
    
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-background border border-border rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border bg-muted/50">
            <h3 className="text-xl font-semibold">{module.title}</h3>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setSelectedModule(null)}
            >
              Close
            </Button>
          </div>
          <div className="p-6 overflow-auto max-h-[calc(90vh-80px)]">
            <Component user={user} />
          </div>
        </div>
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
      <Card className="bg-blue-50/50 border-blue-200/50">
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
    <Card className="bg-blue-50/50 border-blue-200/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-brand-600" />
            <div>
               <CardTitle className="text-base md:text-lg lg:text-xl">Member Tools</CardTitle>
               <CardDescription className="text-sm md:text-base">
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
                   <h4 className="font-medium text-sm md:text-base text-muted-foreground uppercase tracking-wide">
                     {UNIFIED_MODULE_CATEGORIES.find(c => c.id === category)?.title || category}
                   </h4>
                  <div className="flex-1 h-px bg-border" />
                </div>

                <div className="grid gap-2">
                  {modules.map((module) => (
                     <Card
                       key={module.id}
                       className="cursor-pointer bg-blue-50/30 hover:bg-blue-100/50 border border-blue-200/40 transition-colors"
                       onClick={() => handleModuleClick(module.id)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h5 className="font-medium text-sm md:text-base lg:text-lg">{module.title}</h5>
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
                             <p className="text-xs md:text-sm lg:text-base text-muted-foreground line-clamp-2">
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
