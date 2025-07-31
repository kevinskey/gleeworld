import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { 
  Calendar, 
  User, 
  Plus, 
  CheckCircle, 
  Settings, 
  Music,
  Bell,
  MessageSquare,
  Volume2,
  Download,
  ShoppingBag,
  DollarSign,
  Route,
  MapPin,
  Camera,
  Book as BookIcon,
  Star,
  Award
} from "lucide-react";

export const DashboardModulesSection = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { userProfile } = useUserProfile(user);

  // Check user permissions
  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'super-admin';
  const isPRCoordinator = userProfile?.exec_board_role === 'pr_coordinator';
  const canAccessPR = isAdmin || isPRCoordinator;

  type Module = {
    name: string;
    description: string;
    icon: any;
    route: string;
    requiresPRAccess?: boolean;
  };

  const moduleCategories: Array<{
    title: string;
    icon: any;
    iconColor: string;
    modules: Module[];
  }> = [
    {
      title: "Events",
      icon: Calendar,
      iconColor: "text-green-600",
      modules: [
        {
          name: "Calendar",
          description: "View all events",
          icon: Calendar,
          route: "/calendar"
        },
        {
          name: "Event Planner",
          description: "Plan and budget events",
          icon: Plus,
          route: "/event-planner"
        },
        {
          name: "Attendance",
          description: "Track participation",
          icon: CheckCircle,
          route: "/attendance"
        },
        {
          name: "Performance Scoring",
          description: "Score auditions & performances",
          icon: Star,
          route: "/mobile-scoring"
        }
      ]
    },
    {
      title: "Account",
      icon: User,
      iconColor: "text-purple-600",
      modules: [
        {
          name: "Profile",
          description: "Manage info",
          icon: User,
          route: "/profile"
        },
        {
          name: "Settings",
          description: "Preferences",
          icon: Settings,
          route: "/settings"
        }
      ]
    },
    {
      title: "Music",
      icon: Music,
      iconColor: "text-blue-600",
      modules: [
        {
          name: "Music Library",
          description: "Sheet music & songs",
          icon: Music,
          route: "/music-library"
        },
        {
          name: "Music Studio",
          description: "Recording space",
          icon: Volume2,
          route: "/music-studio"
        },
        {
          name: "Download Center",
          description: "Get your files",
          icon: Download,
          route: "/downloads"
        }
      ]
    },
    {
      title: "Communication",
      icon: Bell,
      iconColor: "text-orange-600",
      modules: [
        {
          name: "Notifications",
          description: "Send messages",
          icon: Bell,
          route: "/notifications/send"
        },
        {
          name: "Announcements",
          description: "Read updates",
          icon: MessageSquare,
          route: "/announcements"
        }
      ]
    },
    {
      title: "PR & Media",
      icon: Camera,
      iconColor: "text-pink-600",
      modules: [
        {
          name: "PR & Media Hub",
          description: "Manage publicity photos",
          icon: Camera,
          route: "/dashboard/pr-hub",
          requiresPRAccess: true
        }
      ]
    },
    {
      title: "Finance",
      icon: DollarSign,
      iconColor: "text-emerald-600",
      modules: [
        {
          name: "Budgets",
          description: "Financial planning",
          icon: DollarSign,
          route: "/budgets"
        },
        {
          name: "Shop",
          description: "Browse merchandise",
          icon: ShoppingBag,
          route: "/shop"
        }
      ]
    },
    {
      title: "Tours",
      icon: Route,
      iconColor: "text-indigo-600",
      modules: [
        {
          name: "Tour Planner",
          description: "Plan and manage tours",
          icon: Route,
          route: "/tour-planner"
        },
        {
          name: "Tour Manager",
          description: "Manage tour logistics",
          icon: MapPin,
          route: "/tour-manager"
        }
      ]
    },
    {
      title: "Resources",
      icon: BookIcon,
      iconColor: "text-teal-600",
      modules: [
        {
          name: "Handbook",
          description: "Official Glee Club handbook",
          icon: BookIcon,
          route: "/handbook"
        }
      ]
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dashboard Modules</CardTitle>
        <CardDescription>Access all your Glee Club features</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {moduleCategories.map((category) => {
            const CategoryIcon = category.icon;
            return (
              <div key={category.title} className="space-y-3">
                <h3 className="font-semibold text-gray-900 flex items-center">
                  <CategoryIcon className={`h-5 w-5 mr-2 ${category.iconColor}`} />
                  {category.title}
                </h3>
                <div className="space-y-2">
                  {category.modules
                    .filter(module => {
                      // Filter out PR Hub for users without access
                      if (module.requiresPRAccess && !canAccessPR) {
                        return false;
                      }
                      return true;
                    })
                    .map((module) => {
                      const ModuleIcon = module.icon;
                      return (
                        <Button 
                          key={module.route}
                          variant="ghost" 
                          className="w-full justify-start h-auto p-3"
                          onClick={() => navigate(module.route)}
                        >
                          <ModuleIcon className="h-4 w-4 mr-2" />
                          <div className="text-left">
                            <div>{module.name}</div>
                            <div className="text-xs text-gray-500">{module.description}</div>
                          </div>
                        </Button>
                      );
                    })}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};