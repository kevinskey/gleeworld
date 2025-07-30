import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { AdminPanel } from "@/components/AdminPanel";
import { HeroManagement } from "@/components/admin/HeroManagement";
import { DashboardSettings } from "@/components/admin/DashboardSettings";
import { YouTubeManagement } from "@/components/admin/YouTubeManagement";
import { UsernamePermissionsManager } from "@/components/admin/UsernamePermissionsManager";
import { SpotlightManagement } from "@/components/admin/spotlight/SpotlightManagement";
import { WelcomeCard } from "./WelcomeCard";
import { QuickActionsSection } from "./sections/QuickActionsSection";
import { AdminControlsSection } from "./sections/AdminControlsSection";
import { GleeClubSpotlightSection } from "./sections/GleeClubSpotlightSection";

import { EventsAndActivitySection } from "./sections/EventsAndActivitySection";
import { DashboardModulesSection } from "./sections/DashboardModulesSection";
import { SpiritualReflectionsSection } from "./sections/SpiritualReflectionsSection";
import { NotificationsSection } from "./sections/NotificationsSection";
import { TasksSection } from "./sections/TasksSection";

import { useAuth } from "@/contexts/AuthContext";
import { useMergedProfile } from "@/hooks/useMergedProfile";
import { useUserDashboardContext } from "@/contexts/UserDashboardContext";
import { useGleeWorldEvents } from "@/hooks/useGleeWorldEvents";
import { useUserContracts } from "@/hooks/useUserContracts";
import { useUsernamePermissions } from "@/hooks/useUsernamePermissions";
import { DASHBOARD_MODULES, hasModuleAccess, hasExecutiveBoardPermissions, DashboardModule } from "@/constants/permissions";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Eye, User, Home, X, Crown } from "lucide-react";

const UserDashboard = React.memo(() => {
  console.log('UserDashboard component rendering...');
  const [viewMode, setViewMode] = useState<'admin' | 'member'>('admin');
  const { user } = useAuth();
  console.log('UserDashboard: User from useAuth:', {
    hasUser: !!user,
    userId: user?.id,
    userEmail: user?.email
  });
  const { profile, loading: profileLoading, error: profileError } = useMergedProfile(user);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  console.log('UserDashboard state:', { 
    user: !!user, 
    profile, 
    profileLoading,
    profileError,
    searchParams: searchParams.toString() 
  });
  
  // Add error logging for profile loading
  if (profileError) {
    console.error('UserDashboard: Profile loading error:', profileError);
  }
  
  
  // Get real events data
  const { events, loading: eventsLoading, getUpcomingEvents } = useGleeWorldEvents();
  
  const { contracts, loading: contractsLoading } = useUserContracts();
  const { permissions: usernamePermissions, loading: permissionsLoading } = useUsernamePermissions(user?.email);
  
  // Get selected module from URL parameter
  const selectedModule = searchParams.get('module');
  
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super-admin';
  
  // Check for admin tab in URL
  const activeTab = searchParams.get('tab');
  const showAdminPanel = isAdmin && activeTab;
  
  const userRole = profile?.role || 'user';
  const userEmail = user?.email || '';

  // Get available modules for this user
  const getAvailableModules = () => {
    const modules: Array<{
      key: DashboardModule;
      module: typeof DASHBOARD_MODULES[DashboardModule];
      source: 'role' | 'username';
    }> = [];

    Object.entries(DASHBOARD_MODULES).forEach(([key, module]) => {
      const moduleKey = key as DashboardModule;
      if (hasModuleAccess(userRole, userEmail, moduleKey, usernamePermissions)) {
        const hasRolePermission = isAdmin;
        const source = hasRolePermission ? 'role' : 'username';
        modules.push({ key: moduleKey, module, source });
      }
    });

    return modules;
  };

  // Check if user has executive board permissions
  const hasExecBoardPerms = hasExecutiveBoardPermissions(userRole, undefined, usernamePermissions);
  
  // Check if user is an exec board member (assigned by super admin)
  const isExecBoardMember = profile?.exec_board_role && profile.exec_board_role.trim() !== '';

  const availableModules = getAvailableModules();

  if (!user || profileLoading) {
    console.log('UserDashboard: No user found or profile loading, showing loading spinner');
    return (
      <UniversalLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <LoadingSpinner size="lg" text={profileLoading ? "Loading profile..." : "Loading dashboard..."} />
        </div>
      </UniversalLayout>
    );
  }
  
  // Show error state if profile failed to load
  if (profileError) {
    console.error('UserDashboard: Profile error, showing error state');
    return (
      <UniversalLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Profile Loading Error</h2>
            <p className="text-gray-600 mb-4">{profileError}</p>
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </div>
      </UniversalLayout>
    );
  }
  
  console.log('UserDashboard: User found, proceeding with render');

  // Show AdminPanel if admin user has a tab parameter
  if (showAdminPanel) {
    return (
      <UniversalLayout>
        <div className="container mx-auto px-4 py-6">
          <div className="mb-6">
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2"
              >
                <Home className="h-4 w-4" />
                Back to Dashboard
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
                Exit Admin Panel
              </Button>
            </div>
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
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/dashboard')}
                  className="flex items-center gap-2"
                >
                  <Home className="h-4 w-4" />
                  Back to Dashboard
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate('/dashboard')}
                  className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                  Exit Module
                </Button>
              </div>
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
  const { dashboardData, payments, notifications, loading: dashboardLoading } = useUserDashboardContext();
  console.log('UserDashboard: Context data loaded', { 
    dashboardData: !!dashboardData, 
    payments: payments?.length, 
    notifications: notifications?.length,
    loading: dashboardLoading
  });
  
  // Prevent rendering until dashboard data is ready to avoid blinking
  if (dashboardLoading) {
    console.log('UserDashboard: Dashboard data still loading, showing loading state');
    return (
      <UniversalLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <LoadingSpinner size="lg" text="Loading dashboard data..." />
        </div>
      </UniversalLayout>
    );
  }
  
  // Create real recent activity from various sources
  const getRecentActivity = () => {
    const activities: Array<{id: string, action: string, time: string, type: string}> = [];
    
    // Add recent payments
    payments?.slice(0, 2).forEach((payment) => {
      activities.push({
        id: `payment-${payment.id}`,
        action: `Payment received: $${payment.amount}`,
        time: new Date(payment.created_at).toLocaleDateString(),
        type: 'payment'
      });
    });
    
    // Add recent notifications
    notifications?.slice(0, 2).forEach((notification) => {
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

  // Get real data with proper filtering for valid events
  const upcomingEventsList = getUpcomingEvents(6)
    .filter(event => {
      // Check for valid date
      const eventDate = new Date(event.start_date);
      const isValidDate = event.start_date && !isNaN(eventDate.getTime());
      
      if (!isValidDate) {
        return false;
      }
      
      return true; // Show all valid events
    })
    .map(event => ({
      id: event.id,
      title: event.title,
      date: event.start_date,
      location: event.location || event.venue_name || undefined,
      type: event.event_type || undefined
    }));
  const recentActivity = getRecentActivity();

  return (
    <UniversalLayout containerized={false}>
      <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-6 space-y-3 sm:space-y-6">
        
        {/* View Mode Toggle for Admins/Executives */}
        {(isAdmin || hasExecBoardPerms) && (
          <div className="flex justify-center mb-4">
            <div className="flex items-center justify-between w-[90vw] max-w-3xl gap-3 sm:gap-6 px-4 sm:px-8 py-2 bg-secondary/10 rounded-lg border">
              <span className="text-xs font-medium text-muted-foreground">Views:</span>
              <div className="flex items-center gap-1 sm:gap-2">
              <Button
                variant={viewMode === 'admin' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('admin')}
                className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 h-8 sm:h-9"
              >
                <Shield className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Admin View</span>
                <span className="xs:hidden">Admin</span>
              </Button>
              <Button
                variant={viewMode === 'member' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('member')}
                className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 h-8 sm:h-9"
              >
                <User className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Member View</span>
                <span className="xs:hidden">Member</span>
              </Button>
              {(isExecBoardMember || hasExecBoardPerms) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/dashboard/executive-board')}
                  className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 h-8 sm:h-9"
                >
                  <Crown className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Exec Board View</span>
                  <span className="xs:hidden">Exec</span>
                </Button>
               )}
             </div>
            </div>
          </div>
        )}
        
        {/* Welcome Card */}
        <WelcomeCard 
          displayName={displayName}
          profile={profile}
        />

        {/* Member Dashboard Elements Only */}
        
        {/* 1. Spiritual Gleeflections */}
        <div className="grid grid-cols-1 gap-6">
          <SpiritualReflectionsSection />
        </div>

        {/* 2. Notifications */}
        <div className="grid grid-cols-1 gap-6">
          <NotificationsSection />
        </div>

        {/* 3. Attendance */}
        <div className="grid grid-cols-1 gap-6">
          <QuickActionsSection isAdmin={isAdmin} actionFilter="attendance" />
        </div>

        {/* 4. Tasks and Dues */}
        <div className="grid grid-cols-1 gap-6">
          <TasksSection />
        </div>

        {/* 5. Events Calendar */}
        <div className="grid grid-cols-1 gap-6">
          <EventsAndActivitySection 
            upcomingEvents={upcomingEventsList}
            recentActivity={recentActivity}
          />
        </div>

        {/* 6. Full Calendar */}
        <div className="grid grid-cols-1 gap-6">
          <QuickActionsSection isAdmin={isAdmin} actionFilter="calendar" />
        </div>

        {/* 7. Music Library - At bottom for infinite scroll */}
        <div className="grid grid-cols-1 gap-6">
          <QuickActionsSection isAdmin={isAdmin} actionFilter="music" />
        </div>

        {/* Show Admin/Executive Features Only for Those Roles and in Admin View Mode */}
        {(isAdmin || hasExecBoardPerms) && viewMode === 'admin' && (
          <>
            {/* Admin Controls Section */}
            <div className="grid grid-cols-1 gap-6">
              {availableModules.length > 0 ? (
                <AdminControlsSection
                  userRole={userRole}
                  userEmail={userEmail}
                  usernamePermissions={usernamePermissions}
                  profile={profile}
                />
              ) : (
                <GleeClubSpotlightSection />
              )}
            </div>


            {/* Dashboard Modules Section */}
            <DashboardModulesSection />
          </>
        )}
      </div>
    </UniversalLayout>
  );
});

export { UserDashboard };