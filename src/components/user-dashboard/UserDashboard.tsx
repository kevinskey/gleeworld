import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { HeroManagement } from "@/components/admin/HeroManagement";
import { DashboardSettings } from "@/components/admin/DashboardSettings";
import { YouTubeManagement } from "@/components/admin/YouTubeManagement";
import { UsernamePermissionsManager } from "@/components/admin/UsernamePermissionsManager";
import { SpotlightManagement } from "@/components/admin/spotlight/SpotlightManagement";
import { WelcomeCard } from "./WelcomeCard";
import { QuickActionsSection } from "./sections/QuickActionsSection";
import { GleeClubSpotlightSection } from "./sections/GleeClubSpotlightSection";

import { DashboardModulesSection } from "./sections/DashboardModulesSection";
import { CommunityHubWidget } from "@/components/unified/CommunityHubWidget";
import { NotificationsSection } from "./sections/NotificationsSection";
import { TasksSection } from "./sections/TasksSection";

import { useAuth } from "@/contexts/AuthContext";
import { useMergedProfile } from "@/hooks/useMergedProfile";
import { useUserDashboardContext } from "@/contexts/UserDashboardContext";
import { useUserContracts } from "@/hooks/useUserContracts";
import { useUsernamePermissions } from "@/hooks/useUsernamePermissions";
import { DASHBOARD_MODULES, hasModuleAccess, hasExecutiveBoardPermissions, DashboardModule } from "@/constants/permissions";
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
  
  
  const { contracts, loading: contractsLoading } = useUserContracts();
  const { permissions: usernamePermissions, loading: permissionsLoading } = useUsernamePermissions(user?.email);
  
  // Get selected module from URL parameter
  const selectedModule = searchParams.get('module');
  
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super-admin';
  
  const userRole = profile?.role || 'user';
  const userEmail = user?.email || '';

  // Check if user has executive board permissions
  const hasExecBoardPerms = hasExecutiveBoardPermissions(userRole, undefined, usernamePermissions);
  
  // Check if user is an exec board member (assigned by super admin)
  const isExecBoardMember = profile?.exec_board_role && profile.exec_board_role.trim() !== '';

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
                <Badge variant="secondary" className="text-xs">
                  <Shield className="h-3 w-3 mr-1" />
                  Admin Module
                </Badge>
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

  const recentActivity = getRecentActivity();

  // Use the same historic campus background as Executive Board Dashboard
  const backgroundImage = "/lovable-uploads/7f76a692-7ffc-414c-af69-fc6585338524.png";

  return (
    <div className="min-h-screen relative">
      {/* Background Image */}
      {backgroundImage && (
        <div 
          className="fixed inset-0 bg-cover bg-center z-0 after:absolute after:inset-0 after:bg-white after:opacity-20"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        />
      )}
      
      {/* Content overlay */}
      <div className="relative z-10">
        <UniversalLayout containerized={false} className="bg-transparent">
          <div className="w-full max-w-7xl mx-auto px-1 sm:px-2 md:px-4 py-1 sm:py-2 md:py-4 space-y-2 sm:space-y-3 md:space-y-4">
        
        {/* View Mode Toggle for Admins/Executives */}
        {(isAdmin || hasExecBoardPerms) && (
          <div className="flex justify-center mb-2 sm:mb-3 md:mb-4">
            <div className="flex items-center justify-between w-full max-w-sm sm:max-w-md md:max-w-lg gap-2 sm:gap-3 md:gap-4 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-secondary/10 rounded-md sm:rounded-lg border">
              <span className="text-xs sm:text-sm font-medium text-muted-foreground">Views:</span>
              <div className="flex items-center gap-1 sm:gap-1.5">
              <Button
                variant={viewMode === 'admin' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('admin')}
                className="flex items-center gap-1 text-xs sm:text-sm px-1.5 sm:px-2 md:px-3 h-7 sm:h-8 md:h-9 min-h-[44px] touch-manipulation"
              >
                <Shield className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Admin</span>
                <span className="sm:hidden">A</span>
              </Button>
              <Button
                variant={viewMode === 'member' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('member')}
                className="flex items-center gap-1 text-xs sm:text-sm px-1.5 sm:px-2 md:px-3 h-7 sm:h-8 md:h-9 min-h-[44px] touch-manipulation"
              >
                <User className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Member</span>
                <span className="sm:hidden">M</span>
              </Button>
              {(isExecBoardMember || hasExecBoardPerms) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/dashboard/executive-board')}
                  className="flex items-center gap-1 text-xs sm:text-sm px-1.5 sm:px-2 md:px-3 h-7 sm:h-8 md:h-9 min-h-[44px] touch-manipulation"
                >
                  <Crown className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Exec</span>
                  <span className="sm:hidden">E</span>
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
        
        {/* Community Hub - Unified spiritual reflections, notifications, and music */}
        <div className="w-full">
          <CommunityHubWidget />
        </div>

        {/* 3. Attendance */}
        <div className="w-full">
          <QuickActionsSection isAdmin={isAdmin} actionFilter="attendance" />
        </div>

        {/* 4. Tasks and Dues */}
        <div className="w-full">
          <TasksSection />
        </div>


        {/* Show Dashboard Modules for Admin/Executive Features */}
        {(isAdmin || hasExecBoardPerms) && viewMode === 'admin' && (
          <div className="w-full">
            <DashboardModulesSection />
          </div>
        )}
          </div>
        </UniversalLayout>
      </div>
    </div>
  );
});

export { UserDashboard };