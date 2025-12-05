import React, { useState } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { ModuleCard } from '@/components/shared/ModuleWrapper';
import { ModuleRegistry } from '@/utils/moduleRegistry';
import { ModuleProps } from '@/types/unified-modules';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

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
        const CategoryIcon = category.icon;
        
        // Calculate if we need scrolling (more than 8 modules for 2 rows x 4 cols)
        const needsScrolling = category.modules.length > 8;
        
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
            
            {/* Spinnable Module Selector - Max 2 rows */}
            <div className="relative">
              <ScrollArea className="w-full">
                <div className="flex gap-3 pb-4" style={{ 
                  display: 'grid',
                  gridTemplateRows: 'repeat(2, 1fr)',
                  gridAutoFlow: 'column',
                  gridAutoColumns: 'minmax(280px, 1fr)',
                  maxHeight: '400px',
                  overflowX: 'auto'
                }}>
                  {category.modules.map((module) => (
                    <ModuleCard
                      key={module.id}
                      title={module.title}
                      description={module.description}
                      icon={module.icon}
                      iconColor={module.iconColor}
                      isNew={module.isNew}
                      onClick={() => setSelectedModule(module.id)}
                      className="w-[280px] h-[180px] flex-shrink-0"
                    />
                  ))}
                </div>
              </ScrollArea>
              
              {/* Scroll indicators */}
              {needsScrolling && (
                <div className="absolute right-2 top-2 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded-md border">
                  Scroll →
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};