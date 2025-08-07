import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from 'react-router-dom';
import { 
  Settings, 
  Users, 
  MessageSquare, 
  Calendar, 
  Music, 
  DollarSign, 
  FileText, 
  Shield,
  Headphones,
  BookOpen,
  UserCheck,
  Bell,
  Mail,
  BarChart3,
  ShoppingCart,
  Camera,
  Briefcase
} from 'lucide-react';

interface ModuleInfo {
  title: string;
  description: string;
  route: string;
  icon: React.ReactNode;
  category: string;
  roles?: string[];
  status?: 'active' | 'mock' | 'partial';
}

const DirectoryPage = () => {
  const navigate = useNavigate();

  const modules: ModuleInfo[] = [
    // Admin Modules
    {
      title: "Admin Dashboard",
      description: "Full administrative control panel",
      route: "/admin",
      icon: <Shield className="h-5 w-5" />,
      category: "Administration",
      roles: ["admin", "super-admin"],
      status: "active"
    },
    {
      title: "Communications Hub", 
      description: "Send notifications, emails, SMS to members",
      route: "/admin/communications",
      icon: <MessageSquare className="h-5 w-5" />,
      category: "Administration",
      roles: ["admin", "executive"],
      status: "active"
    },

    // User Dashboards
    {
      title: "User Dashboard",
      description: "Main member dashboard with all modules",
      route: "/dashboard",
      icon: <Users className="h-5 w-5" />,
      category: "Dashboards",
      status: "active"
    },
    {
      title: "Executive Board Dashboard",
      description: "Executive board tools and communications",
      route: "/executive-dashboard",
      icon: <Briefcase className="h-5 w-5" />,
      category: "Dashboards",
      roles: ["executive"],
      status: "active"
    },

    // Communication Tools
    {
      title: "Send Notifications",
      description: "Direct notification sending interface",
      route: "/send-notification",
      icon: <Bell className="h-5 w-5" />,
      category: "Communications",
      status: "active"
    },
    {
      title: "Unified Communications",
      description: "Complete communication management system",
      route: "/communications",
      icon: <Mail className="h-5 w-5" />,
      category: "Communications",
      status: "active"
    },

    // Music & Performance
    {
      title: "Sheet Music Library",
      description: "Digital sheet music collection and annotations",
      route: "/sheet-music",
      icon: <Music className="h-5 w-5" />,
      category: "Music",
      status: "active"
    },
    {
      title: "Audio Archive",
      description: "Performance recordings and practice tracks",
      route: "/audio-archive",
      icon: <Headphones className="h-5 w-5" />,
      category: "Music",
      status: "active"
    },
    {
      title: "Setlists",
      description: "Concert and performance setlist management",
      route: "/setlists",
      icon: <FileText className="h-5 w-5" />,
      category: "Music",
      status: "active"
    },

    // Educational
    {
      title: "Sight Reading Factory",
      description: "Sight reading practice and assessments",
      route: "/sight-reading",
      icon: <BookOpen className="h-5 w-5" />,
      category: "Education",
      status: "active"
    },
    {
      title: "Music Theory Studio",
      description: "Theory lessons and rhythm transcriptions",
      route: "/music-theory",
      icon: <Music className="h-5 w-5" />,
      category: "Education", 
      status: "active"
    },

    // Administrative Tools
    {
      title: "Budget Management",
      description: "Financial planning and expense tracking",
      route: "/budgets",
      icon: <DollarSign className="h-5 w-5" />,
      category: "Management",
      roles: ["admin", "executive"],
      status: "active"
    },
    {
      title: "Event Calendar",
      description: "Schedule concerts, rehearsals, and events",
      route: "/calendar",
      icon: <Calendar className="h-5 w-5" />,
      category: "Management",
      status: "active"
    },
    {
      title: "Attendance Tracking",
      description: "Monitor rehearsal and event attendance",
      route: "/attendance",
      icon: <UserCheck className="h-5 w-5" />,
      category: "Management",
      status: "active"
    },

    // Member Services
    {
      title: "Auditions",
      description: "Audition applications and evaluations",
      route: "/auditions",
      icon: <Users className="h-5 w-5" />,
      category: "Member Services",
      status: "active"
    },
    {
      title: "Merch Shop",
      description: "Glee Club merchandise and apparel",
      route: "/shop",
      icon: <ShoppingCart className="h-5 w-5" />,
      category: "Member Services",
      status: "active"
    },

    // Analytics & Reports
    {
      title: "Analytics Dashboard",
      description: "Usage stats and performance metrics",
      route: "/analytics",
      icon: <BarChart3 className="h-5 w-5" />,
      category: "Analytics",
      roles: ["admin"],
      status: "active"
    },

    // Media & Content
    {
      title: "Photo Gallery",
      description: "Event photos and member galleries",
      route: "/photos",
      icon: <Camera className="h-5 w-5" />,
      category: "Media",
      status: "active"
    },
    {
      title: "Press Kit",
      description: "Media resources and press materials",
      route: "/press-kit",
      icon: <FileText className="h-5 w-5" />,
      category: "Media",
      status: "active"
    }
  ];

  const categories = [...new Set(modules.map(m => m.category))];

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'partial': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'mock': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">GleeWorld Directory</h1>
        <p className="text-lg text-muted-foreground">
          Complete navigation to all modules and features
        </p>
      </div>

      {categories.map(category => (
        <div key={category} className="space-y-4">
          <h2 className="text-2xl font-semibold border-b pb-2">{category}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules
              .filter(module => module.category === category)
              .map(module => (
                <Card key={module.route} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {module.icon}
                        <CardTitle className="text-lg">{module.title}</CardTitle>
                      </div>
                      {module.status && (
                        <Badge className={getStatusColor(module.status)}>
                          {module.status}
                        </Badge>
                      )}
                    </div>
                    <CardDescription>{module.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {module.roles?.map(role => (
                          <Badge key={role} variant="outline" className="text-xs">
                            {role}
                          </Badge>
                        ))}
                      </div>
                      <Button 
                        onClick={() => navigate(module.route)}
                        size="sm"
                      >
                        Open
                      </Button>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground font-mono">
                      {module.route}
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default DirectoryPage;