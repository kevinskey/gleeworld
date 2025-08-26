import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Crown, 
  Settings, 
  Users, 
  Calendar, 
  MessageSquare,
  DollarSign,
  Music,
  FileText,
  Shield,
  Mail,
  Clock,
  ChevronRight
} from 'lucide-react';
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";

// Simple module definitions - no complex permissions needed
const EXEC_MODULES = [
  // Communications
  {
    id: 'email-management',
    title: 'Email Management',
    description: 'Send emails and manage communications',
    icon: Mail,
    category: 'communications',
    component: () => (
      <div className="p-4 text-center">
        <Mail className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Email management tools coming soon</p>
      </div>
    )
  },
  {
    id: 'calendar-management',
    title: 'Calendar Management',
    description: 'Schedule events and manage the club calendar',
    icon: Calendar,
    category: 'communications',
    component: () => (
      <div className="p-4 text-center">
        <Calendar className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Calendar management tools coming soon</p>
      </div>
    )
  },
  {
    id: 'announcements',
    title: 'Announcements',
    description: 'Create and manage club announcements',
    icon: MessageSquare,
    category: 'communications',
    component: () => (
      <div className="p-4 text-center">
        <MessageSquare className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Announcements management coming soon</p>
      </div>
    )
  },

  // Member Management
  {
    id: 'attendance',
    title: 'Attendance Management',
    description: 'Track member attendance and generate reports',
    icon: Users,
    category: 'member-management',
    component: () => (
      <div className="p-4 text-center">
        <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Attendance management tools coming soon</p>
      </div>
    )
  },
  {
    id: 'member-directory',
    title: 'Member Directory',
    description: 'Manage member profiles and contact information',
    icon: Users,
    category: 'member-management',
    component: () => (
      <div className="p-4 text-center">
        <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Member directory coming soon</p>
      </div>
    )
  },

  // Finance
  {
    id: 'budget-management',
    title: 'Budget Management',
    description: 'Track expenses and manage club finances',
    icon: DollarSign,
    category: 'finances',
    component: () => (
      <div className="p-4 text-center">
        <DollarSign className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Budget management tools coming soon</p>
      </div>
    )
  },
  {
    id: 'receipts',
    title: 'Receipts & Records',
    description: 'Manage receipts and financial records',
    icon: FileText,
    category: 'finances',
    component: () => (
      <div className="p-4 text-center">
        <FileText className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Receipt management coming soon</p>
      </div>
    )
  },

  // Musical
  {
    id: 'music-library',
    title: 'Music Library',
    description: 'Manage sheet music and repertoire',
    icon: Music,
    category: 'musical',
    component: () => (
      <div className="p-4 text-center">
        <Music className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Music library management coming soon</p>
      </div>
    )
  },
  {
    id: 'rehearsal-planning',
    title: 'Rehearsal Planning',
    description: 'Plan rehearsals and track progress',
    icon: Clock,
    category: 'musical',
    component: () => (
      <div className="p-4 text-center">
        <Clock className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Rehearsal planning tools coming soon</p>
      </div>
    )
  },

  // Administration
  {
    id: 'permissions',
    title: 'Permissions',
    description: 'Manage user roles and access',
    icon: Shield,
    category: 'administration',
    component: () => (
      <div className="p-4 text-center">
        <Shield className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Permission management coming soon</p>
      </div>
    )
  },
  {
    id: 'settings',
    title: 'Settings',
    description: 'Configure system settings and preferences',
    icon: Settings,
    category: 'administration',
    component: () => (
      <div className="p-4 text-center">
        <Settings className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">System settings coming soon</p>
      </div>
    )
  }
];

const CATEGORY_CONFIG = {
  'communications': { label: 'Communications', icon: MessageSquare },
  'member-management': { label: 'Member Management', icon: Users },
  'finances': { label: 'Finances', icon: DollarSign },
  'musical': { label: 'Musical', icon: Music },
  'administration': { label: 'Administration', icon: Settings }
};

export const SimpleModuleHub = () => {
  const { user } = useAuth();
  const { profile } = useUserRole();
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Simple check - if user is admin or has any exec-related role, show modules
  const hasAccess = profile?.is_admin || profile?.is_super_admin || profile?.role === 'executive' || user?.email?.includes('admin');

  if (!hasAccess) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            <CardTitle>Executive Board Modules</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">You need executive board access to view modules.</p>
            <p className="text-xs mt-2">Contact an administrator for access.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group modules by category
  const modulesByCategory = EXEC_MODULES.reduce((acc, module) => {
    if (!acc[module.category]) acc[module.category] = [];
    acc[module.category].push(module);
    return acc;
  }, {} as Record<string, typeof EXEC_MODULES>);

  const selectedModuleData = EXEC_MODULES.find(m => m.id === selectedModule);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Executive Board Hub</CardTitle>
              <p className="text-sm text-muted-foreground">{EXEC_MODULES.length} modules available</p>
            </div>
          </div>
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            Executive Access
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {selectedModule && selectedModuleData ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <selectedModuleData.icon className="h-5 w-5" />
                <div>
                  <h3 className="font-medium">{selectedModuleData.title}</h3>
                  <p className="text-sm text-muted-foreground">{selectedModuleData.description}</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setSelectedModule(null)}
              >
                Back
              </Button>
            </div>
            <selectedModuleData.component />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="communications">Comm</TabsTrigger>
              <TabsTrigger value="member-management">Members</TabsTrigger>
              <TabsTrigger value="finances">Finance</TabsTrigger>
              <TabsTrigger value="musical">Musical</TabsTrigger>
              <TabsTrigger value="administration">Admin</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {Object.entries(modulesByCategory).map(([category, modules]) => {
                  const categoryConfig = CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG];
                  const IconComponent = categoryConfig?.icon || Settings;
                  
                  return (
                    <Card key={category} className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <IconComponent className="h-5 w-5 text-primary" />
                        <h4 className="font-medium">{categoryConfig?.label || category}</h4>
                        <Badge variant="outline" className="text-xs">
                          {modules.length}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {modules.slice(0, 3).map((module) => (
                          <Button
                            key={module.id}
                            variant="ghost"
                            className="w-full justify-between text-left h-auto p-2"
                            onClick={() => setSelectedModule(module.id)}
                          >
                            <div className="flex items-center gap-2">
                              <module.icon className="h-4 w-4" />
                              <span className="text-sm">{module.title}</span>
                            </div>
                            <ChevronRight className="h-3 w-3" />
                          </Button>
                        ))}
                        {modules.length > 3 && (
                          <p className="text-xs text-muted-foreground px-2">
                            +{modules.length - 3} more modules
                          </p>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            {Object.entries(modulesByCategory).map(([category, modules]) => (
              <TabsContent key={category} value={category} className="space-y-4">
                <div className="grid gap-3">
                  {modules.map((module) => (
                    <Card 
                      key={module.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setSelectedModule(module.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <module.icon className="h-5 w-5 text-primary" />
                            <div>
                              <h4 className="font-medium">{module.title}</h4>
                              <p className="text-sm text-muted-foreground">{module.description}</p>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};