import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Crown, 
  Users, 
  Calendar, 
  FileText, 
  MessageSquare, 
  BarChart3, 
  Bus, 
  Music, 
  Settings,
  ChevronRight,
  Clock,
  Bell
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface ModuleItem {
  id: string;
  name: string;
  description: string;
  icon: any;
  route?: string;
  count?: number;
  priority?: 'high' | 'medium' | 'low';
  lastActivity?: string;
  category: 'logistics' | 'management' | 'communication' | 'analytics' | 'planning';
}

interface ExecBoardModulePanelProps {
  userEmail?: string;
  className?: string;
}

export const ExecBoardModulePanel = ({ userEmail, className }: ExecBoardModulePanelProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userModules, setUserModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Executive Board Modules Configuration
  const execModules: ModuleItem[] = [
    {
      id: 'tours-logistics',
      name: 'Tours & Logistics',
      description: 'Coordinate tours, travel, and concert logistics',
      icon: Bus,
      route: '/executive-dashboard',
      category: 'logistics',
      priority: 'high'
    },
    {
      id: 'concert-management',
      name: 'Concert Management',
      description: 'Manage concert planning and coordination',
      icon: Music,
      route: '/executive-dashboard',
      category: 'planning',
      priority: 'high'
    },
    {
      id: 'task-manager',
      name: 'Task Management',
      description: 'Assign and track executive board tasks',
      icon: FileText,
      route: '/executive-dashboard',
      category: 'management',
      priority: 'medium'
    },
    {
      id: 'communications',
      name: 'Communications',
      description: 'Internal exec board communications',
      icon: MessageSquare,
      route: '/executive-dashboard',
      category: 'communication',
      priority: 'medium'
    },
    {
      id: 'executive-calendar',
      name: 'Executive Calendar',
      description: 'Shared calendar for executive board',
      icon: Calendar,
      route: '/executive-dashboard',
      category: 'planning',
      priority: 'medium'
    },
    {
      id: 'reports-analytics',
      name: 'Reports & Analytics',
      description: 'Executive board reports and analytics',
      icon: BarChart3,
      route: '/executive-dashboard',
      category: 'analytics',
      priority: 'low'
    }
  ];

  // Load user's enabled modules
  useEffect(() => {
    const loadUserModules = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('gw_executive_board_members')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        if (error) {
          console.error('Error loading executive board info:', error);
          return;
        }

        if (data) {
          // All modules disabled for now
          const defaultModules: string[] = [];
          setUserModules(defaultModules);
        }
      } catch (error) {
        console.error('Error in loadUserModules:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserModules();
  }, [user]);

  const handleModuleClick = (module: ModuleItem) => {
    if (module.route) {
      navigate(module.route);
    } else {
      toast({
        title: "Module Access",
        description: `Opening ${module.name}...`,
      });
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'logistics': return 'text-blue-600 bg-blue-100';
      case 'management': return 'text-green-600 bg-green-100';
      case 'communication': return 'text-purple-600 bg-purple-100';
      case 'analytics': return 'text-orange-600 bg-orange-100';
      case 'planning': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityIcon = (priority?: string) => {
    switch (priority) {
      case 'high': return <Bell className="h-3 w-3 text-red-500" />;
      case 'medium': return <Clock className="h-3 w-3 text-yellow-500" />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <Card className={`w-full max-w-sm ${className}`}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Crown className="h-5 w-5 text-yellow-600" />
            Executive Board
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Filter modules based on user's access
  const availableModules = execModules.filter(module => 
    userModules.includes(module.id)
  );

  const groupedModules = availableModules.reduce((acc, module) => {
    if (!acc[module.category]) {
      acc[module.category] = [];
    }
    acc[module.category].push(module);
    return acc;
  }, {} as Record<string, ModuleItem[]>);

  return (
    <Card className={`w-full max-w-sm ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Crown className="h-5 w-5 text-yellow-600" />
          Executive Board
        </CardTitle>
        <div className="text-xs text-muted-foreground">
          {userEmail || user?.email}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-96">
          <div className="p-4 space-y-4">
            {Object.entries(groupedModules).map(([category, modules]) => (
              <div key={category} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="secondary" 
                    className={`text-xs capitalize ${getCategoryColor(category)}`}
                  >
                    {category}
                  </Badge>
                </div>
                
                <div className="space-y-1">
                  {modules.map((module) => (
                    <Button
                      key={module.id}
                      variant="ghost"
                      className="w-full justify-between h-auto p-2 hover:bg-accent/80"
                      onClick={() => handleModuleClick(module)}
                    >
                      <div className="flex items-start gap-2 text-left">
                        <module.icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {module.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {module.description}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {getPriorityIcon(module.priority)}
                        <ChevronRight className="h-3 w-3" />
                      </div>
                    </Button>
                  ))}
                </div>
                
                {Object.keys(groupedModules).indexOf(category) < Object.keys(groupedModules).length - 1 && (
                  <Separator className="my-2" />
                )}
              </div>
            ))}
            
            {availableModules.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Crown className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No executive modules available</p>
                <p className="text-xs">Contact admin for access</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};