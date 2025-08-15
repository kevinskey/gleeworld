import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Users } from 'lucide-react';
import { useUnifiedModules } from "@/hooks/useUnifiedModules";
import { UNIFIED_MODULE_CATEGORIES } from "@/config/unified-modules";

// Import all available module components for mapping
import { MusicLibraryInlineModule } from '@/components/modules/MusicLibraryInlineModule';
import { UserManagementModule } from '@/components/modules/UserManagementModule';
import { WardrobeModule } from '@/components/modules/WardrobeModule';
import { AuditionsModule } from '@/components/modules/AuditionsModule';
import { PermissionsModule } from '@/components/modules/PermissionsModule';
import { AttendanceModule } from '@/components/modules/AttendanceModule';
import { SightSingingPreviewModule } from '@/components/modules/SightSingingPreviewModule';
import { SettingsModule } from '@/components/dashboard/modules/SettingsModule';

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
  console.log('🎯 Looking up component for module name:', moduleName);
  
  const componentMap: Record<string, React.ComponentType<any>> = {
    // Match actual database module names
    'music-library': MusicLibraryInlineModule,
    'user-management': UserManagementModule,
    'wardrobe': WardrobeModule,
    'auditions': AuditionsModule,
    'permissions': PermissionsModule,
    'attendance': AttendanceModule,
    'sight-reading-preview': SightSingingPreviewModule,
    'sight-reading-generator': SightSingingPreviewModule,
    'settings': SettingsModule,
    
    // Try variations that might exist in database
    'auditions-management': AuditionsModule,
    'wardrobe-management': WardrobeModule,
    'permissions-management': PermissionsModule,
    'attendance-management': AttendanceModule,
    'user-management-module': UserManagementModule,
    
    // Add more mappings as needed
  };
  
  const component = componentMap[moduleName];
  console.log('🎯 Component found:', !!component, component?.name || 'No component');
  
  return component || (() => (
    <div className="p-8 text-center">
      <h3 className="text-lg font-semibold mb-2">Module: {moduleName}</h3>
      <p className="text-muted-foreground">Component not yet implemented</p>
      <p className="text-xs text-muted-foreground mt-2">Available components need to be mapped for: {moduleName}</p>
    </div>
  ));
};

export const MemberModules: React.FC<MemberModulesProps> = ({ user }) => {
  const [selectedModule, setSelectedModule] = useState<string | null>(null);

  console.log('🔍 MemberModules rendering with user:', {
    user,
    hasUser: !!user,
    userId: user?.id,
    userRole: user?.role,
    isAdmin: user?.is_admin || user?.is_super_admin
  });

  // Use unified modules with role-based filtering and executive position
  const { modules: availableModules, loading, getAccessibleModules } = useUnifiedModules({
    userRole: user.role,
    execPosition: user.exec_board_role,
    isAdmin: user.is_admin || user.is_super_admin,
  });

  const accessibleModules = getAccessibleModules();

  console.log('🔍 MemberModules render state:', {
    loading,
    availableModulesCount: availableModules.length,
    accessibleModulesCount: accessibleModules.length,
    selectedModule: selectedModule,
    firstFewModules: availableModules.slice(0, 3).map(m => ({ id: m.id, name: m.name, canAccess: m.permissions.canAccess }))
  });

  console.log('🔍 First few modules with names:', availableModules.slice(0, 5).map(m => ({ id: m.id, name: m.name, title: m.title })));

  console.log('🎨 About to check renderModuleComponent, selectedModule:', selectedModule);

  const handleModuleClick = (moduleId: string) => {
    console.log('🔥 Module click attempted:', { 
      moduleId, 
      selectedModule: selectedModule,
      availableModulesCount: availableModules.length 
    });
    
    const module = availableModules.find(m => m.id === moduleId);
    console.log('🔥 Found module:', { 
      module: module ? { id: module.id, name: module.name, hasPermission: module.hasPermission } : null,
      hasPermissionMethod: !!module?.hasPermission,
      permissionResult: module?.hasPermission ? module.hasPermission('view') : false
    });
    
    if (module && module.hasPermission && module.hasPermission('view')) {
      console.log('🔥 Setting selected module to:', moduleId);
      setSelectedModule(moduleId);
    } else {
      console.log('🔥 Module click blocked - no permission or module not found');
    }
  };

  const renderModuleComponent = () => {
    console.log('🎨 renderModuleComponent called with selectedModule:', selectedModule);
    
    if (!selectedModule) {
      console.log('🎨 No selected module, returning null');
      return null;
    }
    
    const module = availableModules.find(m => m.id === selectedModule);
    console.log('🎨 Found module for rendering:', module ? { id: module.id, name: module.name } : null);
    
    if (!module) {
      console.log('🎨 Module not found, returning null');
      return null;
    }
    
    // Get the component using the module name mapping
    const Component = getModuleComponent(module.name);
    console.log('🎨 Component resolved:', Component?.name || 'Anonymous Component');
    
    const renderedComponent = (
      <div className="mt-4 border-2 border-red-500 p-4 bg-yellow-50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-red-600">MODULE: {module.title}</h3>
          <Button variant="outline" size="sm" onClick={() => setSelectedModule(null)}>
            Close
          </Button>
        </div>
        <div className="border-2 border-blue-500 p-2 bg-blue-50">
          <p className="text-sm text-blue-600 mb-2">Component: {Component?.name || 'Anonymous'}</p>
          <Component user={user} />
        </div>
      </div>
    );
    
    console.log('🎨 Returning rendered component:', renderedComponent);
    return renderedComponent;
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

        {(() => {
          console.log('🎨 In JSX render section, about to call renderModuleComponent()');
          return renderModuleComponent();
        })()}
      </CardContent>
    </Card>
  );
};
