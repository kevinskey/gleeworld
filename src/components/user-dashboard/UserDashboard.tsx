import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EnhancedTooltip } from "@/components/ui/enhanced-tooltip";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ErrorState } from "@/components/shared/ErrorState";
import { 
  Music, 
  Calendar, 
  CheckCircle, 
  DollarSign, 
  Bell, 
  User,
  Clock,
  BookOpen,
  Mic,
  MessageSquare,
  ShoppingBag,
  Star,
  TrendingUp,
  Award,
  Users,
  Volume2,
  Settings,
  Youtube,
  Shield,
  Mail,
  Download,
  Crown,
  Plus,
  FileText,
  ChevronDown
} from "lucide-react";
import { HeroManagement } from "@/components/admin/HeroManagement";
import { DashboardSettings } from "@/components/admin/DashboardSettings";
import { YouTubeManagement } from "@/components/admin/YouTubeManagement";
import { UsernamePermissionsManager } from "@/components/admin/UsernamePermissionsManager";
import { SpotlightManagement } from "@/components/admin/spotlight/SpotlightManagement";
import { WelcomeCard } from "./WelcomeCard";


import { useAuth } from "@/contexts/AuthContext";
import { useMergedProfile } from "@/hooks/useMergedProfile";
import { useDashboardSettings } from "@/hooks/useDashboardSettings";
import { useUserDashboardContext } from "@/contexts/UserDashboardContext";
import { useGleeWorldEvents } from "@/hooks/useGleeWorldEvents";
import { useUserContracts } from "@/hooks/useUserContracts";
import { useUsernamePermissions } from "@/hooks/useUsernamePermissions";
import { useUsers } from "@/hooks/useUsers";
import { mockUsers } from "@/utils/mockUsers";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useState } from "react";
import { format } from "date-fns";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DASHBOARD_MODULES, hasModuleAccess, hasExecutiveBoardPermissions, DashboardModule } from "@/constants/permissions";
import { ChevronUp } from "lucide-react";
import { AdminPanel } from "@/components/AdminPanel";
import { AdminPanelCollapsible } from "@/components/AdminPanelCollapsible";
import { AdminIconsPanel } from "@/components/admin/AdminIconsPanel";
import { UserDashboardProvider } from "@/contexts/UserDashboardContext";

export const UserDashboard = () => {
  const { user } = useAuth();
  const { profile } = useMergedProfile(user);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { getSettingByName } = useDashboardSettings();
  // const { events, loading: eventsLoading, getUpcomingEvents } = useGleeWorldEvents(); // TEMPORARILY DISABLED
  const events: any[] = [];
  const eventsLoading = false;
  const getUpcomingEvents = (limit: number) => [];
  const { contracts, loading: contractsLoading } = useUserContracts();
  const { permissions: usernamePermissions, loading: permissionsLoading } = useUsernamePermissions(user?.email);
  const { users, loading: usersLoading } = useUsers();
  const [isRecentActivityExpanded, setIsRecentActivityExpanded] = useState(false);
  
  // Get selected module from URL parameter
  const selectedModule = searchParams.get('module');
  
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super-admin';
  
  // Check for admin tab in URL
  const activeTab = searchParams.get('tab');
  const showAdminPanel = isAdmin && activeTab;
  
  console.log('UserDashboard Debug:', { 
    isAdmin, 
    activeTab, 
    showAdminPanel, 
    searchParams: searchParams.toString() 
  });
  const userRole = profile?.role || 'user';
  const userEmail = user?.email || '';

  // Get available modules for this user
  const getAvailableModules = () => {
    const modules: Array<{
      key: DashboardModule;
      module: typeof DASHBOARD_MODULES[DashboardModule];
      icon: any;
      source: 'role' | 'username';
    }> = [];

    Object.entries(DASHBOARD_MODULES).forEach(([key, module]) => {
      const moduleKey = key as DashboardModule;
      if (hasModuleAccess(userRole, userEmail, moduleKey, usernamePermissions)) {
        // Determine icon for each module
        let icon = Settings;
        switch (moduleKey) {
          case 'hero_management':
            icon = Star;
            break;
          case 'dashboard_settings':
            icon = Settings;
            break;
          case 'youtube_management':
            icon = Youtube;
            break;
          case 'send_emails':
            icon = Mail;
            break;
          case 'manage_permissions':
            icon = Shield;
            break;
        }

        // Determine permission source
        const hasRolePermission = isAdmin;
        const hasUsernamePermission = usernamePermissions.includes(module.permission);
        const source = hasRolePermission ? 'role' : 'username';

        modules.push({ key: moduleKey, module, icon, source });
      }
    });

    return modules;
  };

  // Check if user has executive board permissions
  const hasExecBoardPerms = hasExecutiveBoardPermissions(userRole, undefined, usernamePermissions);
  
  // Check if user is an exec board member (assigned by super admin)
  const isExecBoardMember = profile?.exec_board_role && profile.exec_board_role.trim() !== '';

  const availableModules = getAvailableModules();

  console.log('UserDashboard Debug:', {
    userEmail,
    userRole,
    isAdmin,
    usernamePermissions,
    permissionsLoading,
    availableModules: availableModules.length,
    availableModuleKeys: availableModules.map(m => m.key),
    profile: profile,
    allModules: Object.keys(DASHBOARD_MODULES),
    moduleAccessResults: Object.keys(DASHBOARD_MODULES).map(key => ({
      module: key,
      hasAccess: hasModuleAccess(userRole, userEmail, key as DashboardModule, usernamePermissions)
    }))
  });

  if (!user) {
    return (
      <UniversalLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <LoadingSpinner size="lg" text="Loading dashboard..." />
        </div>
      </UniversalLayout>
    );
  }

  // Show AdminPanel if admin user has a tab parameter
  if (showAdminPanel) {
    return (
      <UniversalLayout>
        <div className="container mx-auto px-4 py-6">
          <div className="mb-6">
            <Button 
              variant="outline" 
              onClick={() => navigate('/dashboard')}
              className="mb-4"
            >
              ← Back to Dashboard
            </Button>
          </div>
          <AdminPanel activeTab={activeTab} />
        </div>
      </UniversalLayout>
    );
  }

  // Dynamic module rendering based on permissions
  if (selectedModule) {
    const moduleKey = selectedModule.replace(/-/g, '_') as DashboardModule;
    const hasAccess = hasModuleAccess(userRole, userEmail, moduleKey, usernamePermissions);
    
    if (hasAccess) {
      const renderModuleComponent = () => {
        switch (selectedModule) {
          case 'hero-management':
            return <HeroManagement />;
          case 'dashboard-settings':
            return <DashboardSettings />;
          case 'youtube-management':
            return <YouTubeManagement />;
          case 'manage-permissions':
            return <UsernamePermissionsManager />;
          case 'spotlight-management':
            return <SpotlightManagement />;
          default:
            return (
              <Card>
                <CardHeader>
                  <CardTitle>Module Not Available</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>This module is not yet implemented or you don't have access to it.</p>
                </CardContent>
              </Card>
            );
        }
      };

      return (
        <UniversalLayout>
          <div className="container mx-auto px-4 py-6">
            <div className="mb-4 flex items-center justify-between">
              <Button variant="outline" onClick={() => navigate('/dashboard')}>
                ← Back to Dashboard
              </Button>
              <div className="flex items-center gap-2">
                {availableModules.find(m => m.key === moduleKey)?.source === 'username' && (
                  <Badge variant="secondary" className="text-xs">
                    <Shield className="h-3 w-3 mr-1" />
                    Special Access
                  </Badge>
                )}
              </div>
            </div>
            {renderModuleComponent()}
          </div>
        </UniversalLayout>
      );
    }
  }

  // Get user's actual name from profile, fallback to email username
  const displayName = profile?.full_name || user.email?.split('@')[0] || 'Member';

  // Get user dashboard data from context
  const { dashboardData, payments, notifications } = useUserDashboardContext();
  
  // Create real recent activity from various sources
  const getRecentActivity = () => {
    const activities: Array<{id: string, action: string, time: string, type: string}> = [];
    
    // Add recent payments
    payments?.slice(0, 2).forEach((payment, index) => {
      activities.push({
        id: `payment-${payment.id}`,
        action: `Payment received: $${payment.amount}`,
        time: new Date(payment.created_at).toLocaleDateString(),
        type: 'payment'
      });
    });
    
    // Add recent notifications
    notifications?.slice(0, 2).forEach((notification, index) => {
      activities.push({
        id: `notification-${notification.id}`,
        action: notification.message,
        time: new Date(notification.created_at).toLocaleDateString(),
        type: 'notification'
      });
    });
    
    // Add recent contracts
    contracts?.slice(0, 2).forEach((contract) => {
      activities.push({
        id: `contract-${contract.id}`,
        action: `Contract ${contract.signature_status}: ${contract.title}`,
        time: new Date(contract.created_at).toLocaleDateString(),
        type: 'contract'
      });
    });
    
    return activities.slice(0, 4);
  };

  // Get real data
  const upcomingEventsList = getUpcomingEvents(6);
  const recentActivity = getRecentActivity();

  return (
    <UserDashboardProvider>
      <UniversalLayout containerized={false}>
        <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-6 space-y-4 sm:space-y-6">
          
          {/* Compact Welcome Card */}
          <WelcomeCard 
            displayName={displayName}
            profile={profile}
          />

          {/* Grid Layout: Quick Actions & Admin Controls/Glee Club Spotlight */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quick Actions - 50% */}
            <Card className="h-fit">
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-lg sm:text-xl">Quick Actions</CardTitle>
                <CardDescription className="hidden sm:block">Access your most-used features</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4">
                  <EnhancedTooltip content="View your attendance records and manage attendance">
                    <Button 
                      className="h-14 sm:h-16 md:h-20 flex-col space-y-0.5 sm:space-y-1 md:space-y-2 text-xs sm:text-sm w-full px-1 sm:px-3" 
                      variant="outline"
                      onClick={() => navigate('/attendance')}
                    >
                      <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                      <span className="text-center leading-tight text-[10px] sm:text-xs md:text-sm">Attendance</span>
                    </Button>
                  </EnhancedTooltip>
                  <EnhancedTooltip content="View calendar and events">
                    <Button 
                      className="h-14 sm:h-16 md:h-20 flex-col space-y-0.5 sm:space-y-1 md:space-y-2 text-xs sm:text-sm w-full px-1 sm:px-3" 
                      variant="outline"
                      onClick={() => navigate('/calendar')}
                    >
                      <Calendar className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                      <span className="text-center leading-tight text-[10px] sm:text-xs md:text-sm">Calendar</span>
                    </Button>
                  </EnhancedTooltip>
                  <EnhancedTooltip content="Send notification to yourself or others">
                    <Button 
                      className="h-14 sm:h-16 md:h-20 flex-col space-y-0.5 sm:space-y-1 md:space-y-2 text-xs sm:text-sm w-full px-1 sm:px-3" 
                      variant="outline"
                      onClick={() => navigate('/notifications/send')}
                    >
                      <Bell className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                      <span className="text-center leading-tight text-[10px] sm:text-xs md:text-sm">Send<br className="sm:hidden"/>Notification</span>
                    </Button>
                  </EnhancedTooltip>
                  <EnhancedTooltip content="View announcements">
                    <Button 
                      className="h-14 sm:h-16 md:h-20 flex-col space-y-0.5 sm:space-y-1 md:space-y-2 text-xs sm:text-sm w-full px-1 sm:px-3" 
                      variant="outline"
                      onClick={() => navigate('/announcements')}
                    >
                      <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                      <span className="text-center leading-tight text-[10px] sm:text-xs md:text-sm">Announcements</span>
                    </Button>
                  </EnhancedTooltip>
                  {isAdmin && (
                    <EnhancedTooltip content="Manage user accounts and permissions">
                      <Button 
                        className="h-14 sm:h-16 md:h-20 flex-col space-y-0.5 sm:space-y-1 md:space-y-2 text-xs sm:text-sm w-full px-1 sm:px-3" 
                        variant="outline"
                        onClick={() => navigate('/dashboard?tab=users')}
                      >
                        <Users className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                        <span className="text-center leading-tight text-[10px] sm:text-xs md:text-sm">Manage<br className="sm:hidden"/>Users</span>
                      </Button>
                    </EnhancedTooltip>
                  )}
                  <EnhancedTooltip content="Manage budgets and financial planning">
                    <Button 
                      className="h-14 sm:h-16 md:h-20 flex-col space-y-0.5 sm:space-y-1 md:space-y-2 text-xs sm:text-sm w-full px-1 sm:px-3" 
                      variant="outline"
                      onClick={() => navigate('/budgets')}
                    >
                      <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                      <span className="text-center leading-tight text-[10px] sm:text-xs md:text-sm">Manage<br className="sm:hidden"/>Budgets</span>
                    </Button>
                  </EnhancedTooltip>
                  <EnhancedTooltip content="Access music library and sheet music">
                    <Button 
                      className="h-14 sm:h-16 md:h-20 flex-col space-y-0.5 sm:space-y-1 md:space-y-2 text-xs sm:text-sm w-full px-1 sm:px-3" 
                      variant="outline"
                      onClick={() => navigate('/music-library')}
                    >
                      <Music className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                      <span className="text-center leading-tight text-[10px] sm:text-xs md:text-sm">Music<br className="sm:hidden"/>Library</span>
                    </Button>
                  </EnhancedTooltip>
                </div>
              </CardContent>
            </Card>

            {/* Admin Controls (for users with admin permissions) OR Glee Club Spotlight */}
            {availableModules.length > 0 ? (
              <Card className="h-fit">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="h-5 w-5 mr-2 text-blue-600" />
                    Admin Controls
                    {profile?.role === 'super-admin' && (
                      <Badge variant="destructive" className="ml-2 text-xs">Super Admin</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {profile?.role === 'super-admin' 
                      ? 'Full system access' 
                      : `${availableModules.length} module${availableModules.length !== 1 ? 's' : ''} available`
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Add Alumnae Portal Admin button for super-admins */}
                  {profile?.role === 'super-admin' && (
                    <div className="mb-4">
                      <Button
                        className="w-full justify-start h-12 bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700"
                        onClick={() => navigate('/admin/alumnae')}
                      >
                        <div className="h-6 w-6 mr-3 text-yellow-300">
                          🎓
                        </div>
                        <div className="text-left">
                          <div className="font-medium">Alumnae Portal Admin</div>
                          <div className="text-xs text-purple-100">Manage alumni content & stories</div>
                        </div>
                      </Button>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4">
                    {availableModules.slice(0, 8).map((module) => {
                      const IconComponent = module.icon;
                      return (
                        <EnhancedTooltip key={module.key} content={module.module.description}>
                          <Button
                            className="h-14 sm:h-16 md:h-20 flex-col space-y-0.5 sm:space-y-1 md:space-y-2 text-xs sm:text-sm w-full relative px-1 sm:px-3"
                            variant="outline"
            onClick={() => navigate(`/dashboard?module=${module.key.replace(/_/g, '-')}`)}
          >
                            <IconComponent className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                            <span className="text-center leading-tight text-[10px] sm:text-xs md:text-sm">{module.module.name}</span>
                            {module.source === 'username' && (
                              <div className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full" />
                            )}
                          </Button>
                        </EnhancedTooltip>
                      );
                    })}
                  </div>
                  {availableModules.length > 8 && (
                    <div className="mt-4 text-center">
                      <Button variant="ghost" size="sm" className="text-xs">
                        +{availableModules.length - 8} more modules
                      </Button>
                    </div>
                  )}
                </CardContent>
                
                {/* Add admin icons panel for admins */}
                {isAdmin && (
                  <div className="mt-4 px-6 pb-6">
                    <AdminIconsPanel />
                  </div>
                )}
              </Card>
            ) : (
              <Card className="h-fit">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Star className="h-5 w-5 mr-2 text-yellow-500" />
                    Glee Club Spotlight
                  </CardTitle>
                  <CardDescription>Member recognition and community updates</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                      <div className="flex items-center space-x-3">
                        <Award className="h-8 w-8 text-yellow-600 flex-shrink-0" />
                        <div>
                          <h4 className="font-semibold">Member of the Month</h4>
                          <p className="text-sm text-gray-600">Congratulations to Sarah Johnson for outstanding dedication!</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                      <div className="flex items-center space-x-3">
                        <TrendingUp className="h-8 w-8 text-blue-600 flex-shrink-0" />
                        <div>
                          <h4 className="font-semibold">Latest Achievement</h4>
                          <p className="text-sm text-gray-600">First place at the Regional Choir Competition!</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-gradient-to-r from-green-50 to-teal-50 rounded-lg border border-green-200">
                      <div className="flex items-center space-x-3">
                        <Users className="h-8 w-8 text-green-600 flex-shrink-0" />
                        <div>
                          <h4 className="font-semibold">Community Impact</h4>
                          <p className="text-sm text-gray-600">Raised $5,000 for local music education programs!</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Executive Board Card */}
          {isExecBoardMember && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Crown className="h-5 w-5 mr-2 text-amber-600" />
                  Executive Board
                  <Badge variant="outline" className="ml-2 text-xs border-amber-200 text-amber-700">
                    Leadership
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Executive board functions and event management
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <EnhancedTooltip content="Create events, budgets, and other executive board items">
                    <Button 
                      className="h-16 sm:h-18 md:h-20 flex-col space-y-1 sm:space-y-2 text-xs sm:text-sm w-full px-1 sm:px-3" 
                      variant="outline"
                      onClick={() => navigate('/exec-board/create')}
                    >
                      <Plus className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                      <span className="text-center leading-tight text-[10px] sm:text-xs md:text-sm">Create</span>
                    </Button>
                  </EnhancedTooltip>
                  <EnhancedTooltip content="Manage ongoing events, budgets, and executive board activities">
                    <Button 
                      className="h-16 sm:h-18 md:h-20 flex-col space-y-1 sm:space-y-2 text-xs sm:text-sm w-full px-1 sm:px-3" 
                      variant="outline"
                      onClick={() => navigate('/exec-board/manage')}
                    >
                      <Settings className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                      <span className="text-center leading-tight text-[10px] sm:text-xs md:text-sm">Manage</span>
                    </Button>
                  </EnhancedTooltip>
                  <EnhancedTooltip content="Assess performance, review reports, and analyze executive board metrics">
                    <Button 
                      className="h-16 sm:h-18 md:h-20 flex-col space-y-1 sm:space-y-2 text-xs sm:text-sm w-full px-1 sm:px-3" 
                      variant="outline"
                      onClick={() => navigate('/exec-board/assess')}
                    >
                      <FileText className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                      <span className="text-center leading-tight text-[10px] sm:text-xs md:text-sm">Assess</span>
                    </Button>
                  </EnhancedTooltip>
                  <EnhancedTooltip content="View executive board members and access position pages">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          className="h-16 sm:h-18 md:h-20 flex-col space-y-1 sm:space-y-2 text-xs sm:text-sm w-full px-1 sm:px-3" 
                          variant="outline"
                        >
                          <Users className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                          <div className="flex items-center gap-1">
                            <span className="text-center leading-tight text-[10px] sm:text-xs md:text-sm">Members</span>
                            <ChevronDown className="h-2 w-2 sm:h-3 sm:w-3" />
                          </div>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent 
                        align="end" 
                        className="w-48 bg-white border shadow-lg z-50"
                      >
                        <DropdownMenuItem onClick={() => navigate('/exec-board/president')}>
                          <Crown className="h-4 w-4 mr-2" />
                          President
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/exec-board/vice-president')}>
                          <Shield className="h-4 w-4 mr-2" />
                          Vice President
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/exec-board/secretary')}>
                          <FileText className="h-4 w-4 mr-2" />
                          Secretary
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/exec-board/treasurer')}>
                          <DollarSign className="h-4 w-4 mr-2" />
                          Treasurer
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/exec-board/business-manager')}>
                          <ShoppingBag className="h-4 w-4 mr-2" />
                          Business Manager
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/exec-board/librarian')}>
                          <BookOpen className="h-4 w-4 mr-2" />
                          Librarian
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/exec-board/chaplain')}>
                          <Star className="h-4 w-4 mr-2" />
                          Chaplain
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/exec-board/historian')}>
                          <Calendar className="h-4 w-4 mr-2" />
                          Historian
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/exec-board/social-chair')}>
                          <Users className="h-4 w-4 mr-2" />
                          Social Chair
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </EnhancedTooltip>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upcoming Events - Horizontal Carousel */}
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Events</CardTitle>
                <CardDescription>Your next rehearsals and performances</CardDescription>
              </CardHeader>
              <CardContent>
                {upcomingEventsList.length > 0 ? (
                  <Carousel className="w-full">
                    <CarouselContent className="-ml-2 md:-ml-4">
                      {upcomingEventsList.map((event) => (
                        <CarouselItem key={event.id} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
                          <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg min-w-[280px]">
                            <Calendar className="h-5 w-5 text-blue-600 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium truncate">{event.title}</h4>
                              <p className="text-sm text-gray-600">{format(new Date(event.start_date), 'PPP')}</p>
                              {event.location && (
                                <p className="text-sm text-gray-500 truncate">{event.location}</p>
                              )}
                            </div>
                          </div>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    <CarouselPrevious className="hidden md:flex" />
                    <CarouselNext className="hidden md:flex" />
                  </Carousel>
                ) : (
                  <p className="text-gray-500 text-center py-4">No upcoming events scheduled</p>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader 
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setIsRecentActivityExpanded(!isRecentActivityExpanded)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Your latest actions and updates</CardDescription>
                  </div>
                  <EnhancedTooltip content={isRecentActivityExpanded ? "Collapse" : "Expand"}>
                    <Button variant="ghost" size="sm" className="p-2">
                      {isRecentActivityExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </EnhancedTooltip>
                </div>
              </CardHeader>
              {isRecentActivityExpanded && (
                <CardContent className="space-y-4 animate-fade-in">
                  {recentActivity.length > 0 ? (
                    recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                        {activity.type === 'music' && <Music className="h-5 w-5 text-blue-600" />}
                        {activity.type === 'attendance' && <CheckCircle className="h-5 w-5 text-green-600" />}
                        {activity.type === 'practice' && <Clock className="h-5 w-5 text-purple-600" />}
                        {activity.type === 'payment' && <DollarSign className="h-5 w-5 text-emerald-600" />}
                        {activity.type === 'notification' && <Bell className="h-5 w-5 text-orange-600" />}
                        {activity.type === 'contract' && <CheckCircle className="h-5 w-5 text-purple-600" />}
                        <div className="flex-1">
                          <p className="font-medium">{activity.action}</p>
                          <p className="text-sm text-gray-500">{activity.time}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-4">No recent activity</p>
                  )}
                </CardContent>
              )}
            </Card>
          </div>

          {/* Dashboard Modules */}
          <Card>
            <CardHeader>
              <CardTitle>Dashboard Modules</CardTitle>
              <CardDescription>Access all your Glee Club features</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* Events Category */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900 flex items-center">
                    <Calendar className="h-5 w-5 mr-2 text-green-600" />
                    Events
                  </h3>
                  <div className="space-y-2">
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start h-auto p-3"
                      onClick={() => navigate('/calendar')}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      <div className="text-left">
                        <div>Calendar</div>
                        <div className="text-xs text-gray-500">View all events</div>
                      </div>
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start h-auto p-3"
                      onClick={() => navigate('/event-planner')}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      <div className="text-left">
                        <div>Event Planner</div>
                        <div className="text-xs text-gray-500">Plan and budget events</div>
                      </div>
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start h-auto p-3"
                      onClick={() => navigate('/attendance')}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      <div className="text-left">
                        <div>Attendance</div>
                        <div className="text-xs text-gray-500">Track participation</div>
                      </div>
                    </Button>
                  </div>
                </div>

                {/* Account Category */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900 flex items-center">
                    <User className="h-5 w-5 mr-2 text-purple-600" />
                    Account
                  </h3>
                  <div className="space-y-2">
                    <Button variant="ghost" className="w-full justify-start h-auto p-3">
                      <User className="h-4 w-4 mr-2" />
                      <div className="text-left">
                        <div>Profile</div>
                        <div className="text-xs text-gray-500">Manage info</div>
                      </div>
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start h-auto p-3"
                      onClick={() => navigate('/announcements')}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      <div className="text-left">
                        <div>Announcements</div>
                        <div className="text-xs text-gray-500">Stay updated</div>
                      </div>
                    </Button>
                    <Button variant="ghost" className="w-full justify-start h-auto p-3">
                      <ShoppingBag className="h-4 w-4 mr-2" />
                      <div className="text-left">
                        <div>Store</div>
                        <div className="text-xs text-gray-500">Merchandise</div>
                      </div>
                    </Button>
                  </div>
                </div>

                {/* Special Modules - Dynamic based on permissions */}
                {availableModules.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-900 flex items-center">
                      <Settings className="h-5 w-5 mr-2 text-orange-600" />
                      Special Access
                    </h3>
                    <div className="space-y-2">
                      {availableModules.map((moduleInfo) => {
                        const IconComponent = moduleInfo.icon;
                        return (
                          <Button 
                            key={moduleInfo.key}
                            variant="ghost" 
                            className="w-full justify-start h-auto p-3 relative"
            onClick={() => {
              console.log('Module clicked:', moduleInfo.key);
              navigate(`/dashboard?module=${moduleInfo.key.replace(/_/g, '-')}`);
            }}
                          >
                            <IconComponent className="h-4 w-4 mr-2" />
                            <div className="text-left flex-1">
                              <div className="flex items-center justify-between">
                                <span>{moduleInfo.module.name}</span>
                                {moduleInfo.source === 'username' && (
                                  <Badge variant="secondary" className="text-xs ml-2">
                                    <Shield className="h-3 w-3 mr-1" />
                                    Special
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-gray-500">{moduleInfo.module.description}</div>
                            </div>
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Executive Board Actions */}
                {hasExecBoardPerms && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-900 flex items-center">
                      <Users className="h-5 w-5 mr-2 text-indigo-600" />
                      Executive Board
                    </h3>
                    <div className="space-y-2">
                      <Button variant="ghost" className="w-full justify-start h-auto p-3">
                        <Mail className="h-4 w-4 mr-2" />
                        <div className="text-left">
                          <div>Email Campaigns</div>
                          <div className="text-xs text-gray-500">Send emails to members</div>
                        </div>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

        </div>
      </UniversalLayout>
    </UserDashboardProvider>
  );
};
