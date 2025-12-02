import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Settings, 
  Calendar, 
  FileText, 
  Mail, 
  Shield, 
  DollarSign, 
  Music, 
  Package, 
  BarChart3,
  Database,
  UserCheck,
  Radio
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AdminModule {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  route?: string;
  action?: () => void;
  status?: 'active' | 'pending' | 'disabled';
  badge?: string;
}

interface AdminToolsWidgetProps {
  onNavigateToTab?: (tab: string, subTab?: string) => void;
}

export const AdminToolsWidget = ({ onNavigateToTab }: AdminToolsWidgetProps = {}) => {
  const navigate = useNavigate();

  const adminModules: AdminModule[] = [
    {
      title: "User Management",
      description: "Manage member accounts, roles, and permissions",
      icon: Users,
      route: "/admin?category=member-management&subcategory=user-management",
      status: 'active',
      badge: "Core"
    },
    {
      title: "Financial Management", 
      description: "Payments, stipends, dues, and budgets",
      icon: DollarSign,
      route: "/admin/finance",
      status: 'pending',
      badge: "Critical"
    },
    {
      title: "Event & Calendar",
      description: "Manage performances, rehearsals, and tours",
      icon: Calendar,
      route: "/admin/events",
      status: 'pending',
      badge: "Core"
    },
    {
      title: "Media Library",
      description: "Manage audio files, sheet music, and photos",
      icon: Music,
      route: "/admin/media",
      status: 'pending',
      badge: "Core"
    },
    {
      title: "Radio Management",
      description: "Manage radio station, playlists, and audio content",
      icon: Radio,
      action: () => onNavigateToTab?.('management', 'radio'),
      status: 'active',
      badge: "Core"
    },
    {
      title: "Communications",
      description: "Newsletters, SMS, and member notifications",
      icon: Mail,
      route: "/admin/communications",
      status: 'pending',
      badge: "Core"
    },
    {
      title: "Inventory & Shop",
      description: "Merchandise, concert items, and sales",
      icon: Package,
      route: "/admin/inventory",
      status: 'pending',
      badge: "Business"
    },
    {
      title: "Analytics & Reports",
      description: "Usage stats, financial reports, and insights",
      icon: BarChart3,
      route: "/admin/analytics",
      status: 'pending',
      badge: "Insights"
    },
    {
      title: "System Settings",
      description: "Platform configuration and preferences",
      icon: Settings,
      route: "/admin/settings",
      status: 'pending',
      badge: "Config"
    },
    {
      title: "Access Control",
      description: "Role assignments and security policies",
      icon: Shield,
      route: "/admin/access",
      status: 'pending',
      badge: "Security"
    },
    {
      title: "Database Admin",
      description: "Advanced database operations and backups",
      icon: Database,
      route: "/admin/database",
      status: 'pending',
      badge: "Technical"
    },
    {
      title: "Executive Board",
      description: "Board-specific tools and oversight",
      icon: UserCheck,
      route: "/admin/executive",
      status: 'pending',
      badge: "Leadership"
    },
    {
      title: "Documents & Forms",
      description: "Contracts, W9s, and official paperwork",
      icon: FileText,
      route: "/admin/documents",
      status: 'pending',
      badge: "Legal"
    }
  ];

  const handleModuleClick = (module: AdminModule) => {
    if (module.route) {
      navigate(module.route);
    } else if (module.action) {
      module.action();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
      case 'pending': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'disabled': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getBadgeColor = (badge: string) => {
    switch (badge) {
      case 'Core': return 'bg-primary/10 text-primary';
      case 'Critical': return 'bg-destructive/10 text-destructive';
      case 'Business': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
      case 'Security': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
      case 'Technical': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
      case 'Leadership': return 'bg-secondary/20 text-secondary-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card className="bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 border-primary/20 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Shield className="h-5 w-5" />
          Administrative Control Center
        </CardTitle>
        <CardDescription>
          Comprehensive tools for managing the Spelman College Glee Club platform
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {adminModules.map((module, index) => {
            const IconComponent = module.icon;
            return (
              <Button
                key={index}
                variant="ghost"
                className="h-auto p-4 flex flex-col items-start text-left border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200"
                onClick={() => handleModuleClick(module)}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <IconComponent className="h-5 w-5 text-primary" />
                  <div className="flex gap-1">
                    {module.badge && (
                      <Badge className={`${getBadgeColor(module.badge)} text-xs px-1.5 py-0.5`}>
                        {module.badge}
                      </Badge>
                    )}
                    {module.status && (
                      <Badge className={`${getStatusColor(module.status)} text-xs px-1.5 py-0.5`}>
                        {module.status}
                      </Badge>
                    )}
                  </div>
                </div>
                <h4 className="font-semibold text-sm mb-1">{module.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {module.description}
                </p>
              </Button>
            );
          })}
        </div>
        
        <div className="mt-6 pt-4 border-t border-border/50">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Admin Backbone Status: Development Phase</span>
            <Badge variant="outline" className="text-xs">
              12 Modules Planned
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};