import React, { useState } from 'react';
import { ModuleWrapper } from '@/components/shared/ModuleWrapper';
import { ModuleRegistry } from '@/utils/moduleRegistry';
import { ModuleConfig } from '@/types/modules';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Route } from 'lucide-react';

interface TourManagerDashboardProps {
  user?: {
    id: string;
    email?: string;
    full_name?: string;
    role?: string;
    exec_board_role?: string;
    is_exec_board?: boolean;
    created_at?: string;
  };
}

export const TourManagerDashboard = ({ user }: TourManagerDashboardProps) => {
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<string[]>([]);

  const handleModuleSelect = (moduleId: string) => {
    const module = ModuleRegistry.getModule(moduleId);
    if (module) {
      setSelectedModule(moduleId);
      setBreadcrumb(['Tour Manager', module.title]);
    }
  };

  const handleBackToDashboard = () => {
    setSelectedModule(null);
    setBreadcrumb([]);
  };

  const renderSelectedModule = () => {
    if (!selectedModule) return null;
    
    const module = ModuleRegistry.getModule(selectedModule);
    if (!module) return null;

    const ModuleComponent = module.fullPageComponent || module.component;
    
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleBackToDashboard}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Tour Manager
          </Button>
          <div className="text-sm text-muted-foreground">
            {breadcrumb.join(' / ')}
          </div>
        </div>
        
        <ModuleComponent 
          user={user} 
          isFullPage={true}
          onNavigate={handleModuleSelect}
        />
      </div>
    );
  };

  const renderModuleGrid = () => {
    const categories = ModuleRegistry.getCategories();
    
    return (
      <div className="space-y-8">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Route className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Tour Manager</h1>
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Comprehensive tour planning and management system for the Spelman College Glee Club. 
            Access all the tools you need to plan, organize, and execute successful tours.
          </p>
        </div>

        <div className="grid gap-6">
          {categories.map((category) => {
            const categoryModules = category.modules.filter(module => 
              !module.requiredPermissions || 
              ModuleRegistry.hasPermission(module.id, user?.role ? [user.role] : [])
            );

            if (categoryModules.length === 0) return null;

            const CategoryIcon = category.icon;

            return (
              <div key={category.id} className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-${category.color}-100 text-${category.color}-600`}>
                    <CategoryIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">{category.title}</h2>
                    <p className="text-sm text-muted-foreground">{category.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {categoryModules.map((module) => {
                    const ModuleIcon = module.icon;
                    
                    return (
                      <div
                        key={module.id}
                        className="bg-card rounded-lg border border-border p-4 hover:shadow-md transition-shadow cursor-pointer group"
                        onClick={() => handleModuleSelect(module.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg bg-${module.iconColor}-100 text-${module.iconColor}-600 group-hover:scale-105 transition-transform`}>
                            <ModuleIcon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium text-foreground text-sm truncate">
                                {module.title}
                              </h3>
                              {module.isNew && (
                                <span className="px-1.5 py-0.5 bg-primary text-primary-foreground text-xs rounded-full">
                                  New
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {module.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        {selectedModule ? renderSelectedModule() : renderModuleGrid()}
      </div>
    </div>
  );
};