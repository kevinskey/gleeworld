import React, { useState, lazy, Suspense, useMemo, useEffect } from 'react';
import { MessagesPanel } from './MessagesPanel';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Users, Calendar as CalendarIcon, Eye, Music, ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { SuperAdminDashboard } from '@/components/member-view/dashboards/SuperAdminDashboard';
import { PublicDashboardMonitor } from '@/components/admin/PublicDashboardMonitor';
import { FanDashboardMonitor } from '@/components/admin/FanDashboardMonitor';
import { AlumnaeDashboardMonitor } from '@/components/admin/AlumnaeDashboardMonitor';
import { ExecBoardModulePanel } from '@/components/executive/ExecBoardModulePanel';
import FanDashboard from '@/pages/FanDashboard';
import AlumnaeLanding from '@/pages/AlumnaeLanding';
import { GleeWorldLanding } from '@/pages/GleeWorldLanding';
import { ModuleDisplay } from './ModuleDisplay';
import { DashboardNavigation } from './DashboardNavigation';
import { MetalHeaderDashboard } from '@/components/shared/MetalHeaderDashboard';
import { ConcertTicketBanner } from '@/components/shared/ConcertTicketBanner';
import { PollReminderPopup } from '@/components/polls/PollReminderPopup';
import { supabase } from '@/integrations/supabase/client';
// Lazy load heavy components to improve initial load time
const CommunityHubModule = lazy(() => import('./modules/CommunityHubModule').then(m => ({
  default: m.CommunityHubModule
})));
const DashboardFeaturesCarousel = lazy(() => import('@/components/hero/DashboardFeaturesCarousel').then(m => ({
  default: m.default
})));
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
  const [fanViewMode, setFanViewMode] = useState<'monitor' | 'experience'>('monitor');
  const [publicViewMode, setPublicViewMode] = useState<'monitor' | 'experience'>('monitor');
  const location = useLocation();
  const navigate = useNavigate();
  const [simulatedStudentId, setSimulatedStudentId] = useState<string | null>(null);
  const [simulatedMemberId, setSimulatedMemberId] = useState<string | null>(null);
  const [simLoading, setSimLoading] = useState(false);

  // Background removed - no longer checking for custom backgrounds
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const moduleId = params.get('module');
    setActiveModuleId(moduleId ? moduleId : null);
  }, [location.search]);

  // Determine view mode based on current route - memoized to prevent infinite renders
  const viewMode = useMemo(() => {
    if (location.pathname === '/dashboard/member') return 'member';
    if (location.pathname === '/dashboard/student') return 'student';
    if (location.pathname === '/dashboard/fan') return 'fan';
    if (location.pathname === '/dashboard/mus240') return 'mus240';
    if (location.pathname === '/dashboard/public') return 'public';
    return 'default'; // /dashboard route
  }, [location.pathname]);

  // When simulating student view, select a sample student (or from ?studentId=)
  useEffect(() => {
    if (viewMode !== 'student') return;
    const run = async () => {
      setSimLoading(true);
      try {
        const params = new URLSearchParams(location.search);
        const sid = params.get('studentId');
        if (sid) {
          setSimulatedStudentId(sid);
          return;
        }
        const {
          data,
          error
        } = await supabase.from('gw_profiles').select('user_id').eq('role', 'student').eq('status', 'active').limit(1).single();
        if (error) {
          console.error('Error fetching sample student:', error);
        }
        setSimulatedStudentId(data?.user_id || null);
      } finally {
        setSimLoading(false);
      }
    };
    run();
  }, [viewMode, location.search]);

  // When simulating member view, select a sample member (or from ?memberId=)
  useEffect(() => {
    if (viewMode !== 'member') return;
    const run = async () => {
      setSimLoading(true);
      try {
        const params = new URLSearchParams(location.search);
        const mid = params.get('memberId');
        if (mid) {
          setSimulatedMemberId(mid);
          return;
        }
        const {
          data,
          error
        } = await supabase.from('gw_profiles').select('user_id').eq('role', 'member').eq('status', 'active').limit(1).single();
        if (error) {
          console.error('Error fetching sample member:', error);
        }
        setSimulatedMemberId(data?.user_id || null);
      } finally {
        setSimLoading(false);
      }
    };
    run();
  }, [viewMode, location.search]);

  // Show loading if profile is still loading
  if (profileLoading) {
    return <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>;
  }

  // Check if we have a profile - if not, show access restricted
  if (!profile) {
    return <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md mx-auto p-8 bg-card rounded-xl shadow-lg text-center">
          <h1 className="text-2xl font-bold mb-4">Access Restricted</h1>
          <p className="text-muted-foreground mb-6">
            Your account profile is not properly configured. Please contact an administrator for assistance.
          </p>
          <p className="text-sm text-muted-foreground">
            User ID: {user?.id}
          </p>
        </div>
      </div>;
  }

  // If module specified via query param, render it directly
  if (activeModuleId && activeModuleId !== 'collapsed-toggle' && viewMode === 'default') {
    // Check if this is a member-specific module that needs the member navigation
    const memberModules = ['music-library', 'member-sight-reading-studio', 'attendance', 'wardrobe', 'karaoke'];
    const showMemberNav = memberModules.includes(activeModuleId) && !profile?.is_admin && !profile?.is_super_admin;
    return <div className="min-h-screen">
        <div className="px-6 py-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="mb-4 hover:bg-primary/10">
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Back to Dashboard</span>
            <span className="sm:hidden">Back</span>
          </Button>
          <ModuleDisplay selectedModule={activeModuleId} />
        </div>
        {showMemberNav && profile && <div className="px-6 pb-8">
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
      </div>;
  }

  // Show different dashboard content based on view mode
  if (viewMode === 'member') {
    // Member view: Simulate member role permissions
    return <div className="min-h-screen">
        <ConcertTicketBanner />
        <div className="py-2 px-2 sm:py-4 sm:px-4 md:py-6 md:px-6 lg:py-4 lg:px-4 max-w-7xl mx-auto">
          {simLoading && <div className="text-center text-muted-foreground py-10">Loading member view…</div>}
          {!simLoading && !simulatedMemberId && <div className="text-center text-muted-foreground py-10">No member found to simulate. Add a member or pass ?memberId=UUID in the URL.</div>}
          {simulatedMemberId && <MetalHeaderDashboard user={{
          id: profile.user_id,
          email: profile.email || '',
          full_name: profile.full_name || '',
          role: 'member',
          exec_board_role: undefined,
          is_exec_board: false,
          created_at: new Date().toISOString()
        }} simulatedRole="member" simulatedUserId={simulatedMemberId} />}
        </div>
      </div>;
  }
  if (viewMode === 'student') {
    // Student view: Simulate student role permissions
    return <div className="min-h-screen">
        <ConcertTicketBanner />
        <div className="py-2 px-2 sm:py-4 sm:px-4 md:py-6 md:px-6 lg:py-4 lg:px-4 max-w-7xl mx-auto">
          {simLoading && <div className="text-center text-muted-foreground py-10">Loading student view…</div>}
          {!simLoading && !simulatedStudentId && <div className="text-center text-muted-foreground py-10">No student found to simulate. Add a student or pass ?studentId=UUID in the URL.</div>}
          {simulatedStudentId && <MetalHeaderDashboard user={{
          id: profile.user_id,
          email: profile.email || '',
          full_name: profile.full_name || '',
          role: 'student',
          // Override to simulate student view
          exec_board_role: undefined,
          is_exec_board: false,
          created_at: new Date().toISOString()
        }} simulatedRole="student" simulatedUserId={simulatedStudentId} />}
        </div>
      </div>;
  }
  if (viewMode === 'fan') {
    // Show monitoring interface for admins viewing fan dashboard
    if (profile?.role === 'super-admin' || profile?.role === 'admin') {
      return <div className="min-h-screen">
          <ConcertTicketBanner />
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
  if (viewMode === 'mus240') {
    return <div className="min-h-screen">
        <ConcertTicketBanner />
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
      return <div className="min-h-screen">
          <ConcertTicketBanner />
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

  // Default view: Use MetalHeaderDashboard for all members
  if (viewMode === 'default') {
    return <div className="min-h-screen">
        <ConcertTicketBanner />
        <div className="md:py-6 lg:py-4 max-w-7xl mx-auto px-0 py-px md:px-0 lg:px-0 sm:py-0 sm:px-0">
          <MetalHeaderDashboard user={{
          id: profile.user_id,
          email: profile.email || '',
          full_name: profile.full_name || '',
          role: profile.role || 'user',
          exec_board_role: profile.exec_board_role,
          is_exec_board: profile.is_exec_board || false,
          created_at: new Date().toISOString()
        }} onToggleMessages={() => setShowMessages(prev => !prev)} className="mx-0 px-0 py-0" />
        </div>
        
        {/* Messages Panel Overlay */}
        {showMessages && <MessagesPanel onClose={() => setShowMessages(false)} />}
      </div>;
  }
  return <div className="min-h-screen">
      

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

      <PollReminderPopup />
    </div>;
};