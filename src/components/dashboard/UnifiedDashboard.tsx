import React, { useState, lazy, Suspense, useMemo, useEffect } from 'react';
import { MessagesPanel } from './MessagesPanel';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { SuperAdminDashboard } from '@/components/member-view/dashboards/SuperAdminDashboard';
import { PublicDashboardMonitor } from '@/components/admin/PublicDashboardMonitor';
import { FanDashboardMonitor } from '@/components/admin/FanDashboardMonitor';
import { AlumnaeDashboardMonitor } from '@/components/admin/AlumnaeDashboardMonitor';
import FanDashboard from '@/pages/FanDashboard';
import AlumnaeLanding from '@/pages/AlumnaeLanding';
import { GleeWorldLanding } from '@/pages/GleeWorldLanding';
import { ModuleDisplay } from './ModuleDisplay';
import { MetalHeaderDashboard } from '@/components/shared/MetalHeaderDashboard';
import { ConcertTicketBanner } from '@/components/shared/ConcertTicketBanner';
import { PollReminderPopup } from '@/components/polls/PollReminderPopup';
import { MyModules } from './MyModules';
import { supabase } from '@/integrations/supabase/client';
import { AdvertisingHero } from '@/components/hero/AdvertisingHero';
import { FourCardLayout } from './FourCardLayout';

// Lazy load heavy components
const MemberNavigation = lazy(() => import('@/components/member/MemberNavigation').then(m => ({
  default: m.MemberNavigation
})));

// Lazy load role-based module cards
const GleeAcademyDashboardCard = lazy(() => import('@/components/user-dashboard/GleeAcademyDashboardCard').then(m => ({
  default: m.GleeAcademyDashboardCard
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
  const [fanViewMode, setFanViewMode] = useState<'monitor' | 'experience'>('monitor');
  const [publicViewMode, setPublicViewMode] = useState<'monitor' | 'experience'>('monitor');
  const location = useLocation();
  const navigate = useNavigate();
  const [simulatedStudentId, setSimulatedStudentId] = useState<string | null>(null);
  const [simulatedMemberId, setSimulatedMemberId] = useState<string | null>(null);
  const [simLoading, setSimLoading] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const moduleId = params.get('module');
    setActiveModuleId(moduleId ? moduleId : null);
  }, [location.search]);

  // Listen for toggle-messages event from UniversalHeader
  useEffect(() => {
    const handleToggleMessages = () => setShowMessages(prev => !prev);
    window.addEventListener('toggle-messages', handleToggleMessages);
    return () => window.removeEventListener('toggle-messages', handleToggleMessages);
  }, []);

  // Determine view mode based on current route
  const viewMode = useMemo(() => {
    if (location.pathname === '/dashboard/member') return 'member';
    if (location.pathname === '/dashboard/student') return 'student';
    if (location.pathname === '/dashboard/fan') return 'fan';
    if (location.pathname === '/dashboard/mus240') return 'mus240';
    if (location.pathname === '/dashboard/public') return 'public';
    return 'default';
  }, [location.pathname]);

  // Simulated student/member view logic
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
        if (error) console.error('Error fetching sample student:', error);
        setSimulatedStudentId(data?.user_id || null);
      } finally {
        setSimLoading(false);
      }
    };
    run();
  }, [viewMode, location.search]);
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
        if (error) console.error('Error fetching sample member:', error);
        setSimulatedMemberId(data?.user_id || null);
      } finally {
        setSimLoading(false);
      }
    };
    run();
  }, [viewMode, location.search]);

  // Loading state
  if (profileLoading) {
    return <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>;
  }

  // No profile - access restricted
  if (!profile) {
    return <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md mx-auto p-8 bg-card rounded-xl shadow-lg text-center">
          <h1 className="text-2xl font-bold mb-4">Access Restricted</h1>
          <p className="text-muted-foreground mb-6">
            Your account profile is not properly configured. Please contact an administrator for assistance.
          </p>
          <p className="text-sm text-muted-foreground">User ID: {user?.id}</p>
        </div>
      </div>;
  }

  // If module specified via query param, render it directly
  if (activeModuleId && activeModuleId !== 'collapsed-toggle' && viewMode === 'default') {
    const memberModules = ['music-library', 'member-sight-reading-studio', 'attendance', 'wardrobe', 'karaoke'];
    const showMemberNav = memberModules.includes(activeModuleId) && !profile?.is_admin && !profile?.is_super_admin;
    return <div className="min-h-screen">
        <div className="px-1 py-1 sm:px-6 sm:py-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="mb-2 sm:mb-4 hover:bg-primary/10">
            <ArrowLeft className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Back to Dashboard</span>
            <span className="sm:hidden">Back</span>
          </Button>
          <ModuleDisplay selectedModule={activeModuleId} />
        </div>
        {showMemberNav && profile && <div className="px-1 sm:px-6 pb-4 sm:pb-8">
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

  // MUS240 view for super admins
  if (viewMode === 'mus240') {
    if (profile?.is_super_admin) {
      return <div className="min-h-screen">
          <ConcertTicketBanner />
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
          </div>
        </div>;
    }
    return <div className="p-8 text-center">Access denied: Super Admin only</div>;
  }

  // Simulated member view
  if (viewMode === 'member') {
    return <div className="min-h-screen">
        <ConcertTicketBanner />
        <div className="py-2 px-2 sm:py-4 sm:px-4 md:py-6 md:px-6 lg:py-4 lg:px-4 max-w-7xl mx-auto">
          {simLoading && <div className="text-center text-muted-foreground py-10">Loading member view…</div>}
          {!simLoading && !simulatedMemberId && <div className="text-center text-muted-foreground py-10">No member found to simulate.</div>}
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

  // Simulated student view
  if (viewMode === 'student') {
    return <div className="min-h-screen">
        <ConcertTicketBanner />
        <div className="py-2 px-2 sm:py-4 sm:px-4 md:py-6 md:px-6 lg:py-4 lg:px-4 max-w-7xl mx-auto">
          {simLoading && <div className="text-center text-muted-foreground py-10">Loading student view…</div>}
          {!simLoading && !simulatedStudentId && <div className="text-center text-muted-foreground py-10">No student found to simulate.</div>}
          {simulatedStudentId && <MetalHeaderDashboard user={{
          id: profile.user_id,
          email: profile.email || '',
          full_name: profile.full_name || '',
          role: 'student',
          exec_board_role: undefined,
          is_exec_board: false,
          created_at: new Date().toISOString()
        }} simulatedRole="student" simulatedUserId={simulatedStudentId} />}
        </div>
      </div>;
  }

  // Fan view
  if (viewMode === 'fan') {
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
    }
    return <FanDashboard />;
  }

  // Public view
  if (viewMode === 'public') {
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
    }
    return <GleeWorldLanding />;
  }

  // Determine role-based content
  const renderRoleBasedModule = () => {
    const role = profile?.role;

    // Students get Glee Academy
    if (role === 'student') {
      return <Suspense fallback={<div className="h-32 bg-muted animate-pulse rounded-lg" />}>
          <GleeAcademyDashboardCard />
        </Suspense>;
    }

    // Fans get Fan dashboard content (simplified card)
    if (role === 'fan') {
      return <FanDashboard />;
    }

    // Alumna get Alumna content
    if (role === 'alumna' || role === 'alumnae') {
      return <AlumnaeLanding />;
    }

    // Admins get Glee Academy + admin tools
    if (profile?.is_admin || profile?.is_super_admin) {
      return <Suspense fallback={<div className="h-32 bg-muted animate-pulse rounded-lg" />}>
          <GleeAcademyDashboardCard />
        </Suspense>;
    }

    // Default: show Glee Academy
    return <Suspense fallback={<div className="h-32 bg-muted animate-pulse rounded-lg" />}>
        <GleeAcademyDashboardCard />
      </Suspense>;
  };

  // DEFAULT VIEW: New streamlined 4-card layout
  return <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-0">
        {/* Advertising Hero - TOP OF DASHBOARD */}
        <AdvertisingHero className="bg-background" />

        <div className="py-4 space-y-6">
          {/* 4 Fixed Cards - Role-specific content */}
          <FourCardLayout role={profile.role} isAdmin={profile.is_admin} isSuperAdmin={profile.is_super_admin} />

          {/* My Modules (assigned modules based on exec role) */}
          <MyModules userProfile={{
          user_id: profile.user_id,
          role: profile.role,
          exec_board_role: profile.exec_board_role,
          is_exec_board: profile.is_exec_board,
          is_admin: profile.is_admin,
          is_super_admin: profile.is_super_admin
        }} />
        </div>
      </div>
      
      {/* Messages Panel Overlay */}
      {showMessages && <MessagesPanel onClose={() => setShowMessages(false)} />}
    </div>;
};