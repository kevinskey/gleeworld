import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Crown, Settings, Users, Calendar, MessageSquare } from 'lucide-react';

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

  // Mock modules for demonstration based on executive role
  const getMockModulesForRole = (role?: string) => {
    const baseModules = [
      {
        id: 'member-management',
        title: 'Member Management',
        description: 'Manage member information and communications',
        category: 'management',
        icon: Users,
        canAccess: true,
        canManage: true
      },
      {
        id: 'calendar-management',
        title: 'Calendar Management', 
        description: 'Schedule and manage events',
        category: 'scheduling',
        icon: Calendar,
        canAccess: true,
        canManage: true
      },
      {
        id: 'communications',
        title: 'Communications',
        description: 'Send announcements and messages',
        category: 'communications',
        icon: MessageSquare,
        canAccess: true,
        canManage: false
      }
    ];

    // Filter based on role
    switch (role?.toLowerCase()) {
      case 'president':
        return baseModules;
      case 'vice-president':
        return baseModules.filter(m => m.id !== 'member-management');
      case 'secretary':
        return baseModules.filter(m => m.category === 'communications');
      case 'treasurer':
        return [
          ...baseModules.filter(m => m.id === 'calendar-management'),
          {
            id: 'financial-management',
            title: 'Financial Management',
            description: 'Manage budgets and expenses',
            category: 'finances',
            icon: Settings,
            canAccess: true,
            canManage: true
          }
        ];
      default:
        return baseModules.slice(0, 2); // Basic access
    }
  };

  const accessibleModules = getMockModulesForRole(user.exec_board_role);

  const handleModuleClick = (moduleId: string) => {
    const module = accessibleModules.find(m => m.id === moduleId);
    if (module && module.canAccess) {
      setSelectedModule(moduleId);
    }
  };

  const renderModuleComponent = () => {
    if (!selectedModule) return null;
    
    const module = accessibleModules.find(m => m.id === selectedModule);
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

  // Group modules by category
  const modulesByCategory = accessibleModules.reduce((acc, module) => {
    const category = module.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(module);
    return acc;
  }, {} as Record<string, typeof accessibleModules>);

  const getCategoryIcon = (category: string) => {
    const icons = {
      'management': Users,
      'scheduling': Calendar,
      'communications': MessageSquare,
      'finances': Settings
    };
    return icons[category as keyof typeof icons] || Settings;
  };

  if (!user.is_exec_board) {
    return null;
  }

  if (accessibleModules.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            <CardTitle>Executive Board Modules</CardTitle>
          </div>
          <CardDescription>
            No modules have been assigned to your executive position yet.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Executive Board Modules</CardTitle>
              <CardDescription>
                Role: {user.exec_board_role} • {accessibleModules.length} modules available
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary">
            Executive Access
          </Badge>
        </div>
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
                    {category}
                  </h4>
                  <div className="flex-1 h-px bg-border" />
                </div>
                
                <div className="grid gap-2">
                  {modules.map((module) => (
                    <Card 
                      key={module.id} 
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => {
                        console.log('Card clicked for module:', module.id);
                        handleModuleClick(module.id);
                      }}
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
                                   <Badge variant="outline" className="text-xs px-1 py-0">
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
        </div>
        
        {renderModuleComponent()}
      </CardContent>
    </Card>
  );
};