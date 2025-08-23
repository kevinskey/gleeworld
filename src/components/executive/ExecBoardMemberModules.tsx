import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crown, Settings, Users, Calendar, MessageSquare } from 'lucide-react';

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

  // Mock modules based on executive position for demonstration
  const getModulesForPosition = (position?: string) => {
    const moduleConfig = {
      'president': [
        { id: 'user-management', title: 'User Management', description: 'Manage member accounts and roles', category: 'management', icon: Users, canAccess: true, canManage: true },
        { id: 'calendar-management', title: 'Calendar Management', description: 'Schedule and manage events', category: 'scheduling', icon: Calendar, canAccess: true, canManage: true },
        { id: 'notifications', title: 'Notifications', description: 'Send announcements to members', category: 'communications', icon: MessageSquare, canAccess: true, canManage: true },
        { id: 'attendance-management', title: 'Attendance Management', description: 'View attendance reports', category: 'scheduling', icon: Calendar, canAccess: true, canManage: false },
        { id: 'budgets', title: 'Budget Management', description: 'View budget information', category: 'finances', icon: Settings, canAccess: true, canManage: false }
      ],
      'vice_president': [
        { id: 'calendar-management', title: 'Calendar Management', description: 'Schedule and manage events', category: 'scheduling', icon: Calendar, canAccess: true, canManage: true },
        { id: 'notifications', title: 'Notifications', description: 'View announcements', category: 'communications', icon: MessageSquare, canAccess: true, canManage: false },
        { id: 'attendance-management', title: 'Attendance Management', description: 'View attendance reports', category: 'scheduling', icon: Calendar, canAccess: true, canManage: false }
      ],
      'secretary': [
        { id: 'notifications', title: 'Notifications', description: 'Send announcements to members', category: 'communications', icon: MessageSquare, canAccess: true, canManage: true },
        { id: 'email-management', title: 'Email Management', description: 'Configure and send emails', category: 'communications', icon: MessageSquare, canAccess: true, canManage: true },
        { id: 'attendance-management', title: 'Attendance Management', description: 'Manage attendance records', category: 'scheduling', icon: Calendar, canAccess: true, canManage: true }
      ],
      'treasurer': [
        { id: 'budgets', title: 'Budget Management', description: 'Manage budgets and expenses', category: 'finances', icon: Settings, canAccess: true, canManage: true },
        { id: 'dues-collection', title: 'Dues Collection', description: 'Collect and track member dues', category: 'finances', icon: Settings, canAccess: true, canManage: true },
        { id: 'calendar-management', title: 'Calendar Management', description: 'View scheduled events', category: 'scheduling', icon: Calendar, canAccess: true, canManage: false }
      ],
      'pr_coordinator': [
        { id: 'pr-coordinator', title: 'PR Hub', description: 'Manage public relations and media', category: 'communications', icon: MessageSquare, canAccess: true, canManage: true },
        { id: 'fan-engagement', title: 'Fan Engagement', description: 'Manage fan community content', category: 'communications', icon: MessageSquare, canAccess: true, canManage: true },
        { id: 'notifications', title: 'Notifications', description: 'View announcements', category: 'communications', icon: MessageSquare, canAccess: true, canManage: false }
      ],
      'librarian': [
        { id: 'sheet-music-library', title: 'Sheet Music Library', description: 'Manage sheet music and scores', category: 'management', icon: Settings, canAccess: true, canManage: true },
        { id: 'music-licensing', title: 'Music Licensing', description: 'Track music rights and permissions', category: 'management', icon: Settings, canAccess: true, canManage: true }
      ],
      'tour_manager': [
        { id: 'tour-logistics', title: 'Tour Logistics', description: 'Manage travel and accommodations', category: 'scheduling', icon: Calendar, canAccess: true, canManage: true },
        { id: 'budget-management', title: 'Tour Budgets', description: 'Track tour expenses', category: 'finances', icon: Settings, canAccess: true, canManage: true }
      ],
      'chaplain': [
        { id: 'spiritual-reflections', title: 'Spiritual Reflections', description: 'Manage devotions and spiritual content', category: 'communications', icon: MessageSquare, canAccess: true, canManage: true }
      ],
      'alumnae_liaison': [
        { id: 'alumnae-portal', title: 'Alumnae Portal', description: 'Manage alumni engagement and events', category: 'communications', icon: Users, canAccess: true, canManage: true },
        { id: 'reunion-planning', title: 'Reunion Planning', description: 'Coordinate alumni reunions', category: 'scheduling', icon: Calendar, canAccess: true, canManage: true }
      ],
      'wardrobe_manager': [
        { id: 'wardrobe-inventory', title: 'Wardrobe Inventory', description: 'Manage performance attire', category: 'management', icon: Settings, canAccess: true, canManage: true }
      ],
      'chief_of_staff': [
        { id: 'operations-oversight', title: 'Operations Oversight', description: 'Coordinate board activities', category: 'management', icon: Users, canAccess: true, canManage: true },
        { id: 'meeting-coordination', title: 'Meeting Coordination', description: 'Schedule and manage board meetings', category: 'scheduling', icon: Calendar, canAccess: true, canManage: true }
      ],
      'student_conductor': [
        { id: 'rehearsal-planning', title: 'Rehearsal Planning', description: 'Plan and coordinate rehearsals', category: 'scheduling', icon: Calendar, canAccess: true, canManage: true },
        { id: 'musical-direction', title: 'Musical Direction', description: 'Assist with musical preparation', category: 'management', icon: Settings, canAccess: true, canManage: true }
      ],
      'set_up_crew_manager': [
        { id: 'event-setup', title: 'Event Setup', description: 'Coordinate performance setups', category: 'scheduling', icon: Calendar, canAccess: true, canManage: true },
        { id: 'equipment-management', title: 'Equipment Management', description: 'Manage technical equipment', category: 'management', icon: Settings, canAccess: true, canManage: true }
      ]
    };

    return moduleConfig[position as keyof typeof moduleConfig] || [];
  };

  const modules = getModulesForPosition(user.exec_board_role);

  const handleModuleClick = (moduleId: string) => {
    const module = modules.find(m => m.id === moduleId);
    if (module && module.canAccess) {
      setSelectedModule(moduleId);
    }
  };

  const renderModuleComponent = () => {
    if (!selectedModule) return null;
    
    const module = modules.find(m => m.id === selectedModule);
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
  const modulesByCategory = modules.reduce((acc, module) => {
    const category = module.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(module);
    return acc;
  }, {} as Record<string, typeof modules>);

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

  if (modules.length === 0) {
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
                Role: {user.exec_board_role} • {modules.length} modules available
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