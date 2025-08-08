import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { ModuleCard } from '@/components/shared/ModuleWrapper';
import { ModuleRegistry } from '@/utils/moduleRegistry';
import { ModuleProps } from '@/types/unified-modules';

interface ModularAdminDashboardProps {
  user: {
    id: string;
    email?: string;
    full_name?: string;
    role?: string;
    exec_board_role?: string;
    is_exec_board?: boolean;
    created_at?: string;
  };
}

export const ModularAdminDashboard = ({ user }: ModularAdminDashboardProps) => {
  const [selectedModule, setSelectedModule] = useState<string | null>(null);

  // If a module is selected, render it in full page mode
  if (selectedModule) {
    const module = ModuleRegistry.getModule(selectedModule);
    if (module) {
      const ModuleComponent = module.component;
      return (
        <div className="min-h-screen">
          {/* Breadcrumb navigation */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
            <span 
              className="cursor-pointer hover:text-foreground"
              onClick={() => setSelectedModule(null)}
            >
              Admin Dashboard
            </span>
            <ChevronRight className="h-4 w-4" />
            <span 
              className="cursor-pointer hover:text-foreground"
              onClick={() => setSelectedModule(null)}
            >
              {ModuleRegistry.getCategory(module.category)?.title}
            </span>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground font-medium">{module.title}</span>
          </div>
          
          <ModuleComponent 
            user={user} 
            isFullPage={true}
            onNavigate={(moduleId: string) => setSelectedModule(moduleId)}
          />
        </div>
      );
    }
  }

  // Main dashboard view - show categories with modules below each category
  return (
    <div className="space-y-6">
      <div className="border-l-4 border-primary pl-4">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Manage all aspects of the Glee Club through modular tools
        </p>
      </div>

      {/* Render each category with its modules */}
      {ModuleRegistry.getCategories().map((category) => {
        console.log('ModularAdminDashboard: Rendering category:', category.title, 'modules:', category.modules.length, 'id:', category.id);
        const CategoryIcon = category.icon;
        
        return (
          <div key={category.id} className="space-y-4">
            {/* Category Header */}
            <div className="border-l-4 border-primary pl-4">
              <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <CategoryIcon className={`h-5 w-5 text-${category.color}-600`} />
                {category.title}
              </h2>
              <p className="text-xs text-muted-foreground">{category.description}</p>
            </div>
            
            {/* Modules Grid for this category */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {category.modules.map((module) => (
                <ModuleCard
                  key={module.id}
                  title={module.title}
                  description={module.description}
                  icon={module.icon}
                  iconColor={module.iconColor}
                  isNew={module.isNew}
                  onClick={() => setSelectedModule(module.id)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};