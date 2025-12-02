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
import { PermissionsPanel } from "@/components/admin/PermissionsPanel";
import { PRCoordinatorHub } from "@/components/pr-coordinator/PRCoordinatorHub";
import AlumnaeLanding from "@/pages/AlumnaeLanding";
import { WelcomeCard } from "./WelcomeCard";
import { QuickActionsSection } from "./sections/QuickActionsSection";
import { QuickActions } from "@/components/community/QuickActions";
import { GleeClubSpotlightSection } from "./sections/GleeClubSpotlightSection";
import { DashboardHeroManagerModule } from "@/components/modules/DashboardHeroManagerModule";
import { DashboardModulesSection } from "./sections/DashboardModulesSection";
import { CommunityHubWidget } from "@/components/unified/CommunityHubWidget";
import { NotificationsSection } from "./sections/NotificationsSection";
import { TasksSection } from "./sections/TasksSection";
import { BookingRequestManager } from "@/components/tour-manager/BookingRequestManager";
import { ExecBoardMemberModules } from "@/components/executive/ExecBoardMemberModules";

import { useAuth } from "@/contexts/AuthContext";
import { useMergedProfile } from "@/hooks/useMergedProfile";
import { useUserDashboardContext } from "@/contexts/UserDashboardContext";
import { useUserContracts } from "@/hooks/useUserContracts";
import { useUsernamePermissions } from "@/hooks/useUsernamePermissions";

import { DASHBOARD_MODULES, hasModuleAccess, hasExecutiveBoardPermissions, DashboardModule } from "@/constants/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Eye, User, Home, X, Crown, ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const UserDashboard = React.memo(() => {
  console.log('UserDashboard component starting to render...');
  console.log('🔍 QuickActions import check:', typeof QuickActions);
  const [viewMode, setViewMode] = useState<'admin' | 'member'>('admin');
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  
  
  const { user } = useAuth();
  console.log('UserDashboard: User from useAuth:', {
    hasUser: !!user,
    userId: user?.id,
    userEmail: user?.email
  });
  const { profile, firstName, loading: profileLoading, error: profileError } = useMergedProfile(user);
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
  console.log('🔍 UserDashboard: selectedModule from URL:', selectedModule);
  
  const isAdmin = profile?.is_admin || profile?.is_super_admin;
  console.log('UserDashboard: Admin check debug:', {
    profile,
    is_admin: profile?.is_admin,
    is_super_admin: profile?.is_super_admin,
    isAdmin,
    role: profile?.role
  });
  
  const userRole = profile?.role || 'user';
  const userEmail = user?.email || '';

  // Check if user has executive board permissions
  const hasExecBoardPerms = hasExecutiveBoardPermissions(userRole, undefined, usernamePermissions);
  
  // Check if user is an exec board member (assigned by super admin)
  const isExecBoardMember = profile?.exec_board_role && profile.exec_board_role.trim() !== '';

  console.log('UserDashboard: Permissions debug:', {
    isAdmin,
    hasExecBoardPerms,
    isExecBoardMember,
    shouldShowModules: isAdmin || hasExecBoardPerms
  });

  if (!user || profileLoading) {
    console.log('UserDashboard: No user found or profile loading, showing loading spinner');
    return (
      <UniversalLayout viewMode={viewMode} onViewModeChange={setViewMode}>
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
      <UniversalLayout viewMode={viewMode} onViewModeChange={setViewMode}>
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
            return <DashboardHeroManagerModule />;
          case 'dashboard-settings':
            return <DashboardSettings />;
          case 'youtube-management':
            return <YouTubeManagement />;
          case 'manage-permissions':
            return <UsernamePermissionsManager />;
          case 'spotlight-management':
            return <SpotlightManagement />;
          case 'permissions-panel':
            return <PermissionsPanel />;
          case 'pr-coordinator':
            return <PRCoordinatorHub />;
          case 'alumnae-portal':
            return <AlumnaeLanding />;
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
        <UniversalLayout viewMode={viewMode} onViewModeChange={setViewMode}>
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
  const isHonesty = user.email === 'onnestypeele@spelman.edu' || 
                   user.email?.toLowerCase().includes('onnestypeele') ||
                   profile?.email === 'onnestypeele@spelman.edu' ||
                   profile?.email?.toLowerCase().includes('onnestypeele') ||
                   profile?.first_name?.toLowerCase() === 'onnesty' ||
                   profile?.full_name?.toLowerCase().includes('onnesty');
  
  console.log('UserDashboard: Debug info for user:', {
    userEmail: user.email,
    profileEmail: profile?.email,
    firstName: profile?.first_name,
    fullName: profile?.full_name,
    isHonesty,
    profileData: profile
  });

  // Get user dashboard data from context
  const { dashboardData, payments, notifications, loading: dashboardLoading } = useUserDashboardContext();
  console.log('UserDashboard: Context data loaded', { 
    dashboardData: !!dashboardData, 
    payments: payments?.length, 
    notifications: notifications?.length,
    loading: dashboardLoading
  });
  
  // For admin users, don't wait for dashboard data to show admin modules
  if (isAdmin && dashboardLoading) {
    console.log('UserDashboard: Admin user detected, showing dashboard with loading state for non-critical data');
    // Show admin dashboard immediately with loading indicators for non-critical sections
  } else if (dashboardLoading) {
    console.log('UserDashboard: Dashboard data still loading, showing loading state');
    return (
      <UniversalLayout viewMode={viewMode} onViewModeChange={setViewMode}>
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

  return (
    <UniversalLayout
      containerized={false} 
      className="min-h-screen"
      viewMode={viewMode}
      onViewModeChange={setViewMode}
    >
      
      {/* Content overlay */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-1 sm:px-2 md:px-4 py-1 sm:py-2 md:py-4 flex flex-col gap-4">
    
        {/* Welcome Card - Full width, extends to top */}
        <div className="w-full">
          <WelcomeCard 
            displayName={firstName}
            profile={profile}
          />
        </div>

        {/* Add spacing between WelcomeCard and Community Hub */}
        <div className="mb-4 sm:mb-8 md:mb-12"></div>

        {/* Community Hub and Quick Actions */}
        <div className="w-full">
          {/* Direct QuickActions Component */}
          <QuickActions />
        </div>

        {/* Executive Board Dashboard Section */}
        {isExecBoardMember && (
          <>
            <div className="mb-6"></div>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-brand-800 tracking-wide">EXECUTIVE BOARD DASHBOARD</h2>
              <p className="text-sm text-muted-foreground">Role: {profile?.exec_board_role}</p>
            </div>
            <div className="bg-background border rounded-lg p-6">
              {(() => {
                console.log('UserDashboard: Rendering Executive Board for user:', user.email, 'exec role:', profile?.exec_board_role);
                return null;
              })()}
              <ExecBoardMemberModules user={{
                id: user.id,
                email: user.email || '',
                full_name: profile?.full_name || '',
                role: profile?.role || 'member',
                exec_board_role: profile?.exec_board_role || 'tour_manager', // Use actual role from profile
                is_exec_board: true // Force true since we know Onnesty is exec board
              }} />
            </div>
          </>
        )}

        {/* Dashboard Modules Section */}
        <div className="mt-6">
          <DashboardModulesSection />
        </div>
      
      </div>
    </UniversalLayout>
  );
});

export { UserDashboard };