import React, { useState, lazy, Suspense, useMemo } from 'react';
import { MessagesPanel } from './MessagesPanel';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Users, Calendar as CalendarIcon, Eye, Music } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { SuperAdminDashboard } from '@/components/member-view/dashboards/SuperAdminDashboard';
import { PublicDashboardMonitor } from '@/components/admin/PublicDashboardMonitor';
import { FanDashboardMonitor } from '@/components/admin/FanDashboardMonitor';
import { AlumnaeDashboardMonitor } from '@/components/admin/AlumnaeDashboardMonitor';
import { ExecBoardModulePanel } from '@/components/executive/ExecBoardModulePanel';
import FanDashboard from '@/pages/FanDashboard';
import AlumnaeLanding from '@/pages/AlumnaeLanding';
import { GleeWorldLanding } from '@/pages/GleeWorldLanding';

// Lazy load heavy components to improve initial load time
const CommunityHubModule = lazy(() => import('./modules/CommunityHubModule').then(m => ({
  default: m.CommunityHubModule
})));
const DashboardFeaturesCarousel = lazy(() => import('@/components/hero/DashboardFeaturesCarousel'));
const MemberNavigation = lazy(() => import('@/components/member/MemberNavigation').then(m => ({
  default: m.MemberNavigation
})));
const CalendarViewsLazy = lazy(() => import("@/components/calendar/CalendarViews").then(m => ({
  default: m.CalendarViews
})));
export const UnifiedDashboard = () => {
  const {
    user
  } = useAuth();
  const {
    profile,
    loading: profileLoading
  } = useUserRole();
  const [showMessages, setShowMessages] = useState(false);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [calendarCollapsed, setCalendarCollapsed] = useState(true);
  const [alumnaeViewMode, setAlumnaeViewMode] = useState<'monitor' | 'experience'>('monitor');
  const [fanViewMode, setFanViewMode] = useState<'monitor' | 'experience'>('monitor');
  const [publicViewMode, setPublicViewMode] = useState<'monitor' | 'experience'>('monitor');
  const location = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const moduleId = params.get('module');
    setActiveModuleId(moduleId ? moduleId : null);
  }, [location.search]);

  // Determine view mode based on current route - memoized to prevent infinite renders
  const viewMode = useMemo(() => {
    if (location.pathname === '/dashboard/member') return 'member';
    if (location.pathname === '/dashboard/fan') return 'fan';
    if (location.pathname === '/dashboard/alumnae') return 'alumnae';
    if (location.pathname === '/dashboard/mus240') return 'mus240';
    if (location.pathname === '/dashboard/public') return 'public';
    return 'default'; // /dashboard route
  }, [location.pathname]);

  // Debug logging
  console.log('🎯 UnifiedDashboard rendering:', {
    user: !!user,
    userEmail: user?.email,
    profile: !!profile,
    profileLoading,
    profileData: profile,
    viewMode: viewMode,
    pathname: location.pathname,
    timestamp: new Date().toISOString()
  });

  // Show loading if profile is still loading
  if (profileLoading) {
    console.log('🎯 UnifiedDashboard: Profile still loading...');
    return <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>;
  }

  // Check if we have a profile - if not, show access restricted
  if (!profile) {
    console.log('🎯 UnifiedDashboard: No profile found, showing access restricted');
    return <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center">
        <div className="max-w-md mx-auto p-8 bg-white rounded-xl shadow-lg text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Restricted</h1>
          <p className="text-gray-600 mb-6">
            Your account profile is not properly configured. Please contact an administrator for assistance.
          </p>
          <p className="text-sm text-gray-500">
            User ID: {user?.id}
          </p>
        </div>
      </div>;
  }

  // Show different dashboard content based on view mode
  if (viewMode === 'member') {
    // Show member perspective regardless of actual user role
    return <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30">
        
        {/* Member Dashboard Content */}
        <div className="max-w-full mx-auto px-2 lg:px-6 py-4 space-y-6">
          {/* Glee Academy Hero Section */}
          <div className="relative bg-gradient-to-r from-primary/90 to-primary rounded-xl overflow-hidden cursor-pointer shadow-lg" onClick={() => window.location.href = '/glee-academy'}>
            <div className="absolute inset-0 bg-black/20"></div>
            <div className="relative z-10 p-[30px] text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold mb-2 text-white">Welcome to Glee Academy</h1>
                  
                  <Button variant="secondary" size="sm" className="bg-white text-primary hover:bg-white/90 px-3 py-1 text-xs">
                    Start Learning →
                  </Button>
                </div>
                <div className="hidden md:block">
                  <div className="w-32 h-32 bg-white/10 rounded-full flex items-center justify-center">
                    <Music className="w-16 h-16 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 1: Hero + Features side-by-side */}
          {/* Features carousel */}
          <div className="w-full">
            <Suspense fallback={<div className="h-32 bg-muted animate-pulse rounded-lg" />}>
              <DashboardFeaturesCarousel />
            </Suspense>
          </div>

          {/* Community Hub for Members */}
          <div className="border border-border rounded-xl bg-background/50 backdrop-blur-sm shadow-sm overflow-hidden">
            <Suspense fallback={<div className="h-64 bg-muted animate-pulse rounded" />}>
              <CommunityHubModule />
            </Suspense>
          </div>

          {/* Calendar Section */}
          <div className="bg-card rounded-lg border shadow-sm">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">My Calendar</h2>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setCalendarCollapsed(!calendarCollapsed)}>
                {calendarCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </Button>
            </div>
            <div className={`transition-all duration-300 ${calendarCollapsed ? 'h-0 overflow-hidden' : 'h-auto'}`}>
              <div className="p-4">
                <Suspense fallback={<div className="h-64 bg-muted animate-pulse rounded" />}>
                  <CalendarViewsLazy />
                </Suspense>
              </div>
            </div>
          </div>

          {/* Member Navigation */}
          {profile && <div className="w-full overflow-hidden bg-card rounded-lg border shadow-sm card-compact">
              <h2 className="page-header mb-1 md:mb-4 flex items-center gap-1 md:gap-2">
                <Users className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                Member Resources
              </h2>
              <Suspense fallback={<div className="h-32 bg-muted animate-pulse rounded" />}>
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
              </Suspense>
            </div>}
        </div>

        {/* Messages Panel Overlay */}
        {showMessages && <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50">
            <MessagesPanel onClose={() => setShowMessages(false)} />
          </div>}
      </div>;
  }
  if (viewMode === 'fan') {
    // Show monitoring interface for admins viewing fan dashboard
    if (profile?.role === 'super-admin' || profile?.role === 'admin') {
      return <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30">
          <div className="px-6 py-4">
            <div className="mb-6">
              <div className="flex items-center gap-4 mb-4">
                <h1 className="text-2xl font-bold">Fan Dashboard</h1>
                <div className="flex bg-muted rounded-lg p-1">
                  <button onClick={() => setFanViewMode('monitor')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${fanViewMode === 'monitor' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                    Admin Monitor
                  </button>
                  <button onClick={() => setFanViewMode('experience')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${fanViewMode === 'experience' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                    Fan Experience
                  </button>
                </div>
              </div>
            </div>
            {fanViewMode === 'monitor' ? <FanDashboardMonitor /> : <FanDashboard />}
          </div>
        </div>;
    } else {
      // Show the actual fan dashboard experience for fans
      return <FanDashboard />;
    }
  }
  if (viewMode === 'alumnae') {
    // Show monitoring interface for admins viewing alumnae dashboard
    if (profile?.role === 'super-admin' || profile?.role === 'admin') {
      return <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30">
          <div className="px-6 py-4">
            <div className="mb-6">
              <div className="flex items-center gap-4 mb-4">
                <h1 className="text-2xl font-bold">Alumnae Dashboard</h1>
                <div className="flex bg-muted rounded-lg p-1">
                  <button onClick={() => setAlumnaeViewMode('monitor')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${alumnaeViewMode === 'monitor' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                    Admin Monitor
                  </button>
                  <button onClick={() => setAlumnaeViewMode('experience')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${alumnaeViewMode === 'experience' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                    Alumnae Experience
                  </button>
                </div>
              </div>
            </div>
            {alumnaeViewMode === 'monitor' ? <AlumnaeDashboardMonitor /> : <AlumnaeLanding />}
          </div>
        </div>;
    } else {
      // Show the actual alumnae landing page for alumnae
      return <AlumnaeLanding />;
    }
  }
  if (viewMode === 'mus240') {
    return <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30">
        <div className="px-6 py-4">
          <div className="text-center py-8">
            <h1 className="text-3xl font-bold text-primary mb-4">MUS 240 Class Dashboard</h1>
            <p className="text-muted-foreground mb-6">This is the class dashboard for MUS 240 students</p>
            <Button onClick={() => window.location.href = '/classes/mus240'} className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white px-8 py-3 text-lg">
              Go to MUS 240 Website
            </Button>
          </div>
          {/* MUS 240 class content would go here */}
        </div>
      </div>;
  }
  if (viewMode === 'public') {
    // Show monitoring interface for admins viewing public dashboard
    if (profile?.role === 'super-admin' || profile?.role === 'admin') {
      return <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30">
          <div className="px-6 py-4">
            <div className="mb-6">
              <div className="flex items-center gap-4 mb-4">
                <h1 className="text-2xl font-bold">Public Dashboard</h1>
                <div className="flex bg-muted rounded-lg p-1">
                  <button onClick={() => setPublicViewMode('monitor')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${publicViewMode === 'monitor' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                    Admin Monitor
                  </button>
                  <button onClick={() => setPublicViewMode('experience')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${publicViewMode === 'experience' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                    Public Experience
                  </button>
                </div>
              </div>
            </div>
            {publicViewMode === 'monitor' ? <PublicDashboardMonitor /> : <GleeWorldLanding />}
          </div>
        </div>;
    } else {
      // Show the actual GleeWorld landing page for non-admin users
      return <GleeWorldLanding />;
    }
  }

  // Default view: If user is super admin and on default /dashboard route, show the SuperAdminDashboard
  if ((profile?.is_super_admin || profile?.role === 'super-admin') && viewMode === 'default') {
    return <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30">
        
        <div className="py-2 px-2 sm:py-4 sm:px-4 md:py-6 md:px-6 lg:py-4 lg:px-4 max-w-7xl mx-auto">
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
      </div>;
  }

  // Executive board members get their own dashboard
  if (profile?.is_exec_board && viewMode === 'default') {
    console.log('🎯 UnifiedDashboard: Showing executive board dashboard for user:', profile.user_id);
    return <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30 overflow-auto">
        <div className="px-6 py-4 pb-8">
          <ExecBoardModulePanel />
        </div>
      </div>;
  }
  return <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30">
      

      {/* Row 1: Hero + Features side-by-side */}
      <div className="px-6 py-4">
        <div className="w-full">
          <Suspense fallback={<div className="h-32 bg-muted animate-pulse rounded-lg" />}>
            <DashboardFeaturesCarousel />
          </Suspense>
        </div>
      </div>

      {/* Row 2: Community Hub full width (collapsible when a module is active) */}
      <div className="px-6 pb-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" /> Community Hub
          </div>
          <Button variant="ghost" size="sm" aria-controls="community-hub" aria-expanded={!activeModuleId} onClick={() => setActiveModuleId(prev => prev ? null : 'collapsed-toggle')}>
            {activeModuleId ? 'Expand' : 'Collapse'}
          </Button>
        </div>
        <div id="community-hub" className="border border-border rounded-xl bg-background/50 backdrop-blur-sm shadow-sm overflow-hidden transition-[max-height,opacity] duration-300" style={{
        maxHeight: activeModuleId ? 0 : 'calc(45vh + 400px)',
        opacity: activeModuleId ? 0 : 1
      }}>
          <Suspense fallback={<div className="h-64 bg-muted animate-pulse rounded" />}>
            <CommunityHubModule />
          </Suspense>
        </div>
      </div>
      {/* Row 3: Unified Calendar visible to all logged-in users */}
      <div className="px-6 pb-6">
        <div className="mb-2">
          <div className="border-l-4 border-primary pl-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-primary" />
                <h2 className="font-sans font-semibold tracking-tight text-base sm:text-lg md:text-xl">Glee Calendar</h2>
              </div>
              <Button variant="ghost" size="sm" aria-controls="glee-calendar" aria-expanded={!calendarCollapsed} onClick={() => setCalendarCollapsed(v => !v)}>
                {calendarCollapsed ? 'Expand' : 'Collapse'}
              </Button>
            </div>
          </div>
        </div>
        {!calendarCollapsed && <Suspense fallback={<div className="border border-border rounded-xl bg-background/60 p-4">
              Loading calendar…
            </div>}>
            <div id="glee-calendar">
              <CalendarViewsLazy />
            </div>
          </Suspense>}
      </div>

      {/* Row 4: Simple Member Navigation */}
      {profile && <div className="px-6 pb-10">
          <Suspense fallback={<div className="h-32 bg-muted animate-pulse rounded" />}>
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
          </Suspense>
        </div>}

      {/* Messages Panel Overlay */}
      {showMessages && <div className="absolute inset-0 bg-background/95 backdrop-blur-sm z-10">
          <MessagesPanel onClose={() => setShowMessages(false)} />
        </div>}

    </div>;
};