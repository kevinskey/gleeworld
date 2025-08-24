import React, { useState, lazy, Suspense } from 'react';
import { MessagesPanel } from './MessagesPanel';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { CommunityHubModule } from './modules/CommunityHubModule';
import DashboardHeroCarousel from '@/components/hero/DashboardHeroCarousel';
import DashboardFeaturesCarousel from '@/components/hero/DashboardFeaturesCarousel';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Users } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { MemberNavigation } from '@/components/member/MemberNavigation';
import { useUserRole } from '@/hooks/useUserRole';
import { IncompleteProfileBanner } from '@/components/shared/IncompleteProfileBanner';
import { SuperAdminDashboard } from '@/components/member-view/dashboards/SuperAdminDashboard';


export const UnifiedDashboard = () => {
  const { user } = useAuth();
  const { profile } = useUserRole();
  
  const [showMessages, setShowMessages] = useState(false);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const moduleId = params.get('module');
    setActiveModuleId(moduleId ? moduleId : null);
  }, [location.search]);

  // Determine view mode based on current route
  const getViewMode = () => {
    if (location.pathname === '/dashboard/member') return 'member';
    if (location.pathname === '/dashboard/fan') return 'fan';
    if (location.pathname === '/dashboard/alumnae') return 'alumnae';
    if (location.pathname === '/dashboard/mus240') return 'mus240';
    if (location.pathname === '/dashboard/public') return 'public';
    return 'default'; // /dashboard route
  };

  const viewMode = getViewMode();

  // Debug logging
  console.log('🎯 UnifiedDashboard rendering:', {
    user: !!user,
    userEmail: user?.email,
    profile: !!profile,
    profileData: profile,
    viewMode: viewMode,
    pathname: location.pathname,
    timestamp: new Date().toISOString()
  });

  // Show different dashboard content based on view mode
  if (viewMode === 'member') {
    // Show member perspective regardless of actual user role
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30">
        <div className="px-6 pt-4">
          <IncompleteProfileBanner userProfile={profile} />
        </div>
        
        {/* Member Dashboard Content */}
        <div className="px-6 py-4 space-y-6">
          {/* Welcome Section */}
          <div className="bg-card rounded-lg p-6 border shadow-sm">
            <h1 className="text-2xl font-bold text-primary mb-2">Welcome to Your Member Dashboard</h1>
            <p className="text-muted-foreground">Stay connected with the Spelman College Glee Club community.</p>
          </div>

          {/* Row 1: Hero + Features side-by-side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <DashboardHeroCarousel />
            <div className="self-center w-full"><DashboardFeaturesCarousel /></div>
          </div>


          {/* Community Hub for Members */}
          <div className="border border-border rounded-xl bg-background/50 backdrop-blur-sm shadow-sm overflow-hidden">
            <CommunityHubModule />
          </div>


          {/* Member Navigation */}
          {profile && (
            <div className="w-full overflow-hidden bg-card rounded-lg border shadow-sm card-compact">
              <h2 className="page-header mb-1 md:mb-4 flex items-center gap-1 md:gap-2">
                <Users className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                Member Resources
              </h2>
              <MemberNavigation user={{
                id: profile.user_id,
                email: profile.email,
                full_name: profile.full_name,
                role: profile.role,
                exec_board_role: profile.exec_board_role,
                is_exec_board: profile.is_exec_board,
                is_admin: profile.is_admin,
                is_super_admin: profile.is_super_admin
              }} />
            </div>
          )}
        </div>

        {/* Messages Panel Overlay */}
        {showMessages && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50">
            <MessagesPanel onClose={() => setShowMessages(false)} />
          </div>
        )}
      </div>
    );
  }

  if (viewMode === 'fan') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30">
        <div className="px-6 pt-4">
          <IncompleteProfileBanner userProfile={profile} />
        </div>
        <div className="px-6 py-4">
          <div className="text-center py-8">
            <h1 className="text-3xl font-bold text-primary mb-4">Fan Dashboard View</h1>
            <p className="text-muted-foreground">This is how the dashboard appears to fans</p>
          </div>
          {/* Fan-specific content would go here */}
        </div>
      </div>
    );
  }

  if (viewMode === 'alumnae') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30">
        <div className="px-6 pt-4">
          <IncompleteProfileBanner userProfile={profile} />
        </div>
        <div className="px-6 py-4">
          <div className="text-center py-8">
            <h1 className="text-3xl font-bold text-primary mb-4">Alumnae Dashboard View</h1>
            <p className="text-muted-foreground">This is how the dashboard appears to alumnae</p>
          </div>
          {/* Alumnae-specific content would go here */}
        </div>
      </div>
    );
  }

  if (viewMode === 'mus240') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30">
        <div className="px-6 pt-4">
          <IncompleteProfileBanner userProfile={profile} />
        </div>
        <div className="px-6 py-4">
          <div className="text-center py-8">
            <h1 className="text-3xl font-bold text-primary mb-4">MUS 240 Class Dashboard</h1>
            <p className="text-muted-foreground">This is the class dashboard for MUS 240 students</p>
          </div>
          {/* MUS 240 class content would go here */}
        </div>
      </div>
    );
  }

  if (viewMode === 'public') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30">
        <div className="px-6 pt-4">
          <IncompleteProfileBanner userProfile={profile} />
        </div>
        <div className="px-6 py-4">
          <div className="text-center py-8">
            <h1 className="text-3xl font-bold text-primary mb-4">Public Dashboard View</h1>
            <p className="text-muted-foreground">This is how the dashboard appears to the public</p>
          </div>
          {/* Public content would go here */}
        </div>
      </div>
    );
  }

  // Default view: If user is super admin and on default /dashboard route, show the SuperAdminDashboard
  if (profile?.is_super_admin && viewMode === 'default') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30">
        <div className="px-6 pt-4">
          <IncompleteProfileBanner userProfile={profile} />
        </div>
        <div className="px-6 py-4">
          <SuperAdminDashboard user={{
            id: profile.user_id,
            email: profile.email || '',
            full_name: profile.full_name || '',
            role: profile.role || 'super-admin',
            exec_board_role: profile.exec_board_role,
            is_exec_board: profile.is_exec_board || false,
            created_at: new Date().toISOString()
          }} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30">
      
      {/* Incomplete Profile Banner */}
      <div className="px-6 pt-4">
        <IncompleteProfileBanner userProfile={profile} />
      </div>

      {/* Row 1: Hero + Features side-by-side */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          {/* Left: Hero */}
          <DashboardHeroCarousel />
          <div className="self-center w-full"><DashboardFeaturesCarousel /></div>
        </div>
      </div>

      {/* Row 2: Community Hub full width (collapsible when a module is active) */}
      <div className="px-6 pb-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" /> Community Hub
          </div>
          <Button
            variant="ghost"
            size="sm"
            aria-controls="community-hub"
            aria-expanded={!activeModuleId}
            onClick={() => setActiveModuleId((prev) => (prev ? null : 'collapsed-toggle'))}
          >
            {activeModuleId ? 'Expand' : 'Collapse'}
          </Button>
        </div>
        <div
          id="community-hub"
          className="border border-border rounded-xl bg-background/50 backdrop-blur-sm shadow-sm overflow-hidden transition-[max-height,opacity] duration-300"
          style={{ maxHeight: activeModuleId ? 0 : 'calc(45vh + 400px)', opacity: activeModuleId ? 0 : 1 }}
        >
          <CommunityHubModule />
        </div>
      </div>

      {/* Row 4: Simple Member Navigation */}
      {profile && (
        <div className="px-6 pb-10">
          <MemberNavigation user={{
            id: profile.user_id,
            email: profile.email,
            full_name: profile.full_name,
            role: profile.role,
            exec_board_role: profile.exec_board_role,
            is_exec_board: profile.is_exec_board,
            is_admin: profile.is_admin,
            is_super_admin: profile.is_super_admin
          }} />
        </div>
      )}

      {/* Messages Panel Overlay */}
      {showMessages && (
        <div className="absolute inset-0 bg-background/95 backdrop-blur-sm z-10">
          <MessagesPanel onClose={() => setShowMessages(false)} />
        </div>
      )}

    </div>
  );
};
