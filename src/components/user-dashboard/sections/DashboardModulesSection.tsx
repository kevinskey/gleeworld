import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useState } from "react";
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
  Award,
  ChevronDown,
  Users,
  CreditCard,
  Mic,
  Plane,
  Megaphone,
  Wrench,
  BarChart3,
  Heart,
  ShieldCheck,
  Crown,
  Gavel,
  FileText,
  Headphones,
  GraduationCap
} from "lucide-react";

export const DashboardModulesSection = () => {
  console.log('DashboardModulesSection: Component rendering...');
  const navigate = useNavigate();
  const { user } = useAuth();
  const { userProfile } = useUserProfile(user);
  const [openCategories, setOpenCategories] = useState<string[]>([]);

  console.log('DashboardModulesSection: User profile debug:', {
    userProfile,
    hasUserProfile: !!userProfile,
    isAdmin: userProfile?.is_admin,
    isSuperAdmin: userProfile?.is_super_admin
  });

  // Check user permissions
  const isAdmin = userProfile?.is_admin || userProfile?.is_super_admin;
  const isPRCoordinator = userProfile?.exec_board_role === 'pr_coordinator';
  const canAccessPR = isAdmin || isPRCoordinator;
  const isExecutive = userProfile?.role === 'executive' || userProfile?.is_exec_board || isAdmin;

  type Module = {
    name: string;
    description: string;
    icon: any;
    route: string;
    requiresPRAccess?: boolean;
    requiresAdmin?: boolean;
    requiresExecutive?: boolean;
  };

  type Category = {
    title: string;
    icon: any;
    iconColor: string;
    modules: Module[];
  };

  const toggleCategory = (categoryTitle: string) => {
    setOpenCategories(prev => 
      prev.includes(categoryTitle) 
        ? prev.filter(cat => cat !== categoryTitle)
        : [...prev, categoryTitle]
    );
  };

  const moduleCategories: Category[] = [
    {
      title: "Member Management & Administration",
      icon: Users,
      iconColor: "text-blue-600",
      modules: [
        { name: "User Management", description: "Manage member roles & permissions", icon: Users, route: "/user-management", requiresAdmin: true },
        { name: "Executive Board", description: "Manage executive positions", icon: ShieldCheck, route: "/dashboard", requiresExecutive: true },
        { name: "Member Directory", description: "View all members", icon: User, route: "/member-directory" },
        { name: "Exit Interviews", description: "View member exit interview submissions", icon: CheckCircle, route: "/exit-interviews", requiresAdmin: true },
        { name: "Activity Logs", description: "Track member activities", icon: BarChart3, route: "/activity-logs", requiresAdmin: true },
        { name: "Profile", description: "Manage your profile", icon: User, route: "/profile" }
      ]
    },
    {
      title: "Financial Systems",
      icon: CreditCard,
      iconColor: "text-emerald-600",
      modules: [
        { name: "Budget Management", description: "Plan and track budgets", icon: DollarSign, route: "/budgets" },
        { name: "Accounting", description: "Financial records & contracts", icon: CreditCard, route: "/accounting", requiresAdmin: true },
        { name: "Payment Tracking", description: "Track payments & dues", icon: CheckCircle, route: "/dues-management" },
        { name: "W9 Forms", description: "Tax form management", icon: BookIcon, route: "/w9-form" },
        { name: "Shop", description: "Browse merchandise", icon: ShoppingBag, route: "/shop" },
        { name: "Treasurer Tools", description: "Financial management", icon: DollarSign, route: "/treasurer", requiresExecutive: true }
      ]
    },
    {
      title: "Performance & Music Management",
      icon: Mic,
      iconColor: "text-purple-600",
      modules: [
        { name: "Music Library", description: "Sheet music & songs", icon: Music, route: "/music-library" },
        { name: "Music Studio", description: "Recording & practice space", icon: Volume2, route: "/music-studio" },
        { name: "Performance Scoring", description: "Score auditions & performances", icon: Star, route: "/mobile-scoring" },
        { name: "Download Center", description: "Get your music files", icon: Download, route: "/downloads" },
        { name: "Audio Archive", description: "Historical recordings", icon: Volume2, route: "/audio-archive" },
        { name: "MUS240 Groups", description: "Join and manage project teams", icon: Users, route: "/classes/mus240/groups" }
      ]
    },
    {
      title: "Event Planning & Calendar",
      icon: Calendar,
      iconColor: "text-green-600",
      modules: [
        { name: "Calendar", description: "View all events", icon: Calendar, route: "/calendar" },
        { name: "Event Planner", description: "Plan and budget events", icon: Plus, route: "/event-planner" },
        { name: "Attendance", description: "Track participation", icon: CheckCircle, route: "/attendance" },
        { name: "Performance Planning", description: "Plan concerts & shows", icon: Star, route: "/performance" },
        { name: "Event Documentation", description: "Track event details", icon: BookIcon, route: "/event-documentation" }
      ]
    },
    {
      title: "Tour Management",
      icon: Plane,
      iconColor: "text-indigo-600",
      modules: [
        { name: "Tour Planner", description: "Plan and manage tours", icon: Route, route: "/tour-planner" },
        { name: "Tour Manager", description: "Manage tour logistics", icon: MapPin, route: "/tour-manager" },
        { name: "Contract Management", description: "Handle tour contracts", icon: BookIcon, route: "/contract-signing" },
        { name: "Wardrobe Management", description: "Manage tour wardrobe", icon: Award, route: "/wardrobe-management" },
        { name: "Appointments", description: "Schedule appointments", icon: Calendar, route: "/appointments" }
      ]
    },
    {
      title: "Communication & Outreach",
      icon: Megaphone,
      iconColor: "text-orange-600",
      modules: [
        { name: "Notifications", description: "View all notifications", icon: Bell, route: "/notifications" },
        { name: "Mass Communications", description: "Send group messages", icon: Bell, route: "/notifications/send" },
        { name: "PR & Media Hub", description: "Manage publicity", icon: Camera, route: "/dashboard/pr-hub", requiresPRAccess: true },
        { name: "Alumnae Portal", description: "Alumni engagement & mentorship", icon: GraduationCap, route: "/alumnae", requiresAdmin: true },
        { name: "Newsletter Management", description: "Create newsletters", icon: MessageSquare, route: "/newsletter" },
        { name: "Announcements", description: "Read updates", icon: MessageSquare, route: "/announcements" },
        { name: "Booking Forms", description: "Manage performance booking requests", icon: FileText, route: "/booking-forms" },
        { name: "SMS Center", description: "Text messaging", icon: Bell, route: "/sms-center", requiresAdmin: true }
      ]
    },
    {
      title: "Specialized Tools & Resources",
      icon: Wrench,
      iconColor: "text-cyan-600",
      modules: [
        { name: "Historian Workpage", description: "Manage historical records", icon: BookIcon, route: "/historian-workpage" },
        { name: "Chaplain Work Hub", description: "Spiritual guidance tools", icon: Heart, route: "/chaplain-work-hub" },
        { name: "Interview Toolkit", description: "Conduct interviews", icon: MessageSquare, route: "/interview-toolkit" },
        { name: "Templates & Resources", description: "Document templates", icon: BookIcon, route: "/templates" },
        { name: "Handbook", description: "Official Glee Club handbook", icon: BookIcon, route: "/handbook" }
      ]
    },
    {
      title: "Administrative Functions",
      icon: Settings,
      iconColor: "text-gray-600",
      modules: [
        { name: "Dashboard Settings", description: "Configure dashboard", icon: Settings, route: "/dashboard-settings", requiresAdmin: true },
        { name: "System Settings", description: "Global settings", icon: Settings, route: "/settings" },
        { name: "Hero Management", description: "Manage hero content", icon: Star, route: "/hero-management", requiresAdmin: true },
        { name: "YouTube Management", description: "Manage video content", icon: Camera, route: "/youtube-management", requiresAdmin: true },
        { name: "Spotlight Management", description: "Feature highlights", icon: Star, route: "/spotlight-management", requiresAdmin: true },
        { name: "Permissions Panel", description: "Advanced permissions control", icon: ShieldCheck, route: "/dashboard?module=permissions-panel", requiresAdmin: true }
      ]
    },
    {
      title: "Personal Dashboard Features",
      icon: User,
      iconColor: "text-pink-600",
      modules: [
        { name: "My Profile", description: "Personal information", icon: User, route: "/profile" },
        { name: "My Attendance", description: "Personal attendance record", icon: CheckCircle, route: "/my-attendance" },
        { name: "My Contracts", description: "Personal contracts", icon: BookIcon, route: "/my-contracts" },
        { name: "Spiritual Reflections", description: "Personal reflections", icon: Heart, route: "/spiritual-reflections" },
        { name: "Wellness Check-ins", description: "Personal wellness", icon: Heart, route: "/wellness" }
      ]
    },
    {
      title: "Reporting & Analytics",
      icon: BarChart3,
      iconColor: "text-red-600",
      modules: [
        { name: "Activity Reports", description: "Member activity analytics", icon: BarChart3, route: "/activity-reports", requiresAdmin: true },
        { name: "Attendance Analytics", description: "Attendance insights", icon: CheckCircle, route: "/attendance-analytics", requiresExecutive: true },
        { name: "Financial Reports", description: "Budget & expense reports", icon: DollarSign, route: "/financial-reports", requiresExecutive: true },
        { name: "Performance Analytics", description: "Performance metrics", icon: Star, route: "/performance-analytics", requiresExecutive: true },
        { name: "Communication Reports", description: "Message delivery stats", icon: MessageSquare, route: "/communication-reports", requiresAdmin: true }
      ]
    }
  ];

  const filterModule = (module: Module) => {
    console.log('DashboardModulesSection: Filtering module:', module.name, {
      requiresPRAccess: module.requiresPRAccess,
      canAccessPR,
      requiresAdmin: module.requiresAdmin,
      isAdmin,
      requiresExecutive: module.requiresExecutive,
      isExecutive
    });
    if (module.requiresPRAccess && !canAccessPR) return false;
    if (module.requiresAdmin && !isAdmin) return false;
    if (module.requiresExecutive && !isExecutive && !isAdmin) return false;
    return true;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dashboard Modules</CardTitle>
        <CardDescription>Access all your Glee Club features organized by function</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {moduleCategories.map((category) => {
            const CategoryIcon = category.icon;
            const visibleModules = category.modules.filter(filterModule);
            
            if (visibleModules.length === 0) return null;
            
            const isOpen = openCategories.includes(category.title);
            
            return (
              <Collapsible 
                key={category.title} 
                open={isOpen} 
                onOpenChange={() => toggleCategory(category.title)}
              >
                <CollapsibleTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full justify-between p-4 h-auto hover:bg-muted/50"
                  >
                    <div className="flex items-center">
                      <CategoryIcon className={`h-5 w-5 mr-3 ${category.iconColor}`} />
                      <span className="font-semibold">{category.title}</span>
                      <span className="ml-2 text-sm text-muted-foreground">
                        ({visibleModules.length} {visibleModules.length === 1 ? 'item' : 'items'})
                      </span>
                    </div>
                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 p-2 border rounded-lg bg-muted/20">
                    {visibleModules.map((module) => {
                      const ModuleIcon = module.icon;
                      return (
                        <Button 
                          key={module.route}
                          variant="ghost" 
                          className="justify-start h-auto p-3 hover:bg-background border hover:border-border/50"
                          onClick={() => {
                            console.log('DashboardModulesSection: Navigating to:', module.route, 'Module name:', module.name);
                            navigate(module.route);
                          }}
                        >
                          <ModuleIcon className="h-4 w-4 mr-2" />
                          <div className="text-left">
                            <div className="font-medium">{module.name}</div>
                            <div className="text-xs text-muted-foreground">{module.description}</div>
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};