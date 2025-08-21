import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Settings } from 'lucide-react';
import { useUnifiedModules } from "@/hooks/useUnifiedModules";
import { UNIFIED_MODULE_CATEGORIES } from "@/config/unified-modules";

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

export const MemberModules = ({ user }: MemberModulesProps) => {
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  console.log('MemberModules - User:', user);

  // Use unified modules with role-based filtering
  const { 
    modules: availableModules, 
    loading, 
    error,
    getAccessibleModules,
    refetch
  } = useUnifiedModules({
    userId: user.id,
    userRole: user.role,
    isAdmin: user.is_admin || user.is_super_admin
  });

  const accessibleModules = getAccessibleModules();

  const handleModuleClick = (moduleId: string) => {
    console.log('MemberModules - Attempting to access module:', moduleId);
    
    const module = availableModules.find(m => m.id === moduleId);
    console.log('MemberModules - Module found:', !!module, module?.title);
    
    if (module && module.hasPermission) {
      setSelectedModule(moduleId);
      console.log('MemberModules - Successfully loaded module:', moduleId);
    } else {
      console.log('MemberModules - Module not accessible:', moduleId);
    }
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const filteredModules = accessibleModules.filter(module =>
    module.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    module.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderModuleComponent = () => {
    if (!selectedModule) return null;
    
    const module = availableModules.find(m => m.id === selectedModule);
    if (!module) return null;

    const Component = module.component;
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
        <Component user={user} />
      </div>
    );
  };

  // Group modules by category
  const modulesByCategory = filteredModules.reduce((acc, module) => {
    const category = module.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(module);
    return acc;
  }, {} as Record<string, typeof accessibleModules>);

  const getCategoryColor = (category: string) => {
    const colors = {
      'communications': 'blue',
      'finances': 'green',
      'tours': 'purple',
      'attendance': 'orange',
      'musical-leadership': 'indigo',
      'member-management': 'cyan',
      'libraries': 'emerald',
      'system': 'gray'
    };
    return colors[category as keyof typeof colors] || 'gray';
  };

  const getCategoryIcon = (category: string) => {
    const categoryConfig = UNIFIED_MODULE_CATEGORIES.find(c => c.id === category);
    return categoryConfig?.icon;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Member Modules</CardTitle>
          <Input
            type="search"
            placeholder="Search modules..."
            value={searchTerm}
            onChange={handleSearch}
            className="max-w-md"
          />
        </div>
        <CardDescription>
          Explore available modules based on your role.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Object.entries(modulesByCategory).map(([category, modules]) => {
            const IconComponent = getCategoryIcon(category);
            
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
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
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
                          <Settings className="h-3 w-3 ml-2 opacity-50" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}

        {filteredModules.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm ? `No modules found matching "${searchTerm}"` : 'No modules available for your current role'}
          </div>
        )}
        </div>
        
        {renderModuleComponent()}
      </CardContent>
    </Card>
  );
};
