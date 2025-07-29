import { useState } from "react";
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
import { ExecutiveBoardSection } from "./sections/ExecutiveBoardSection";
import { EventsAndActivitySection } from "./sections/EventsAndActivitySection";
import { DashboardModulesSection } from "./sections/DashboardModulesSection";
import { SpiritualReflectionsSection } from "./sections/SpiritualReflectionsSection";
import { AnnouncementsEventsSection } from "./sections/AnnouncementsEventsSection";

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
import { Shield } from "lucide-react";

export const UserDashboard = () => {
  console.log('UserDashboard component rendering...');
  const { user } = useAuth();
  const { profile } = useMergedProfile(user);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  console.log('UserDashboard state:', { user: !!user, profile, searchParams: searchParams.toString() });
  
  
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

  if (!user) {
    console.log('UserDashboard: No user found, showing loading spinner');
    return (
      <UniversalLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <LoadingSpinner size="lg" text="Loading dashboard..." />
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
  console.log('UserDashboard: Context data loaded', { 
    dashboardData: !!dashboardData, 
    payments: payments?.length, 
    notifications: notifications?.length 
  });
  
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

  // Get real data with proper formatting for AnnouncementsEventsSection
  const upcomingEventsList = getUpcomingEvents(6).map(event => ({
    id: event.id,
    title: event.title,
    date: event.start_date,
    location: event.location || event.venue_name || undefined,
    type: event.event_type || undefined
  }));
  const recentActivity = getRecentActivity();

  return (
    <UniversalLayout containerized={false}>
      <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-6 space-y-4 sm:space-y-6">
        
        {/* Welcome Card */}
        <WelcomeCard 
          displayName={displayName}
          profile={profile}
        />

        {/* Spiritual Reflections & Announcements Section - 50/50 split, same height */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SpiritualReflectionsSection />
          <AnnouncementsEventsSection upcomingEvents={upcomingEventsList} />
        </div>

        {/* Quick Actions Section */}
        <div className="grid grid-cols-1 gap-6">
          <QuickActionsSection isAdmin={isAdmin} />
        </div>

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

        {/* Executive Board Section */}
        <ExecutiveBoardSection isExecBoardMember={Boolean(isExecBoardMember)} />

        {/* Events and Activity Section */}
        <EventsAndActivitySection 
          upcomingEvents={upcomingEventsList}
          recentActivity={recentActivity}
        />

        {/* Dashboard Modules Section */}
        <DashboardModulesSection />
      </div>
    </UniversalLayout>
  );
};