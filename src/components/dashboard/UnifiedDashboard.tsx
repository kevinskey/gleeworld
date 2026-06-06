import React, { useState, lazy, Suspense, useMemo, useEffect } from 'react';
import { MessagesPanel } from './MessagesPanel';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, GraduationCap, Youtube, Newspaper, ChevronDown } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { SuperAdminDashboard } from '@/components/member-view/dashboards/SuperAdminDashboard';
import { ControlCenter } from '@/components/dashboard/ControlCenter';
// (PublicDashboardMonitor was deleted in the 2026-05-31 hero consolidation —
// it only existed to read from the legacy gw_hero_slides table. The monitor
// view now falls back to the live GleeWorldLanding.)
import { FanDashboardMonitor } from '@/components/admin/FanDashboardMonitor';
import { AlumnaeDashboardMonitor } from '@/components/admin/AlumnaeDashboardMonitor';
import FanDashboard from '@/pages/FanDashboard';
import AlumnaeLanding from '@/pages/AlumnaeLanding';
import { GleeWorldLanding } from '@/pages/GleeWorldLanding';
import { ModuleDisplay } from './ModuleDisplay';
import { useBrandingSettings } from '@/hooks/useBrandingSettings';
import { MetalHeaderDashboard } from '@/components/shared/MetalHeaderDashboard';
import { ConcertTicketBanner } from '@/components/shared/ConcertTicketBanner';
import { PollReminderPopup } from '@/components/polls/PollReminderPopup';
import { MyModules } from './MyModules';
import { supabase } from '@/integrations/supabase/client';
import { AdvertisingHero } from '@/components/hero/AdvertisingHero';
import { FourCardLayout } from './FourCardLayout';
import { DashboardStoreSection } from './DashboardStoreSection';
import { YouTubeChannelSlider } from './YouTubeChannelSlider';
import { NewsFeedSlider } from './NewsFeedSlider';
import { ScholarshipFeedSlider } from './ScholarshipFeedSlider';
import { OfficeHoursWidget } from './OfficeHoursWidget';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

// Lazy load heavy components
const MemberNavigation = lazy(() => import('@/components/member/MemberNavigation').then((m) => ({
  default: m.MemberNavigation
})));

// Lazy load role-based module cards
const GleeAcademyDashboardCard = lazy(() => import('@/components/user-dashboard/GleeAcademyDashboardCard').then((m) => ({
  default: m.GleeAcademyDashboardCard
})));

const CollapsibleDashboardSection = ({ title, icon, children }: {title: string;icon: React.ReactNode;children: React.ReactNode;}) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border border-white/10 bg-gradient-to-b from-[hsl(208,100%,20%)] via-[hsl(208,100%,17%)] to-[hsl(208,100%,14%)] shadow-sm py-0 rounded-none">
        <CollapsibleTrigger asChild>
          <CardHeader className="py-4 px-4 cursor-pointer hover:bg-white/5 transition-colors rounded-none">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {icon}
                <CardTitle className="text-sm sm:text-xl font-semibold text-white/90" style={{ fontFamily: "'Cinzel', serif" }}>{title}</CardTitle>
              </div>
              <ChevronDown className={`h-5 w-5 text-white/50 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="px-0 pb-0 pt-0">
            {children}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>);

};

export const UnifiedDashboard = () => {
  const {
    user
  } = useAuth();
  const {
    profile,
    loading: profileLoading
  } = useUserRole();
  const { settings: branding, isLoading: brandingLoading } = useBrandingSettings();

  const [showMessages, setShowMessages] = useState(false);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [fanViewMode, setFanViewMode] = useState<'monitor' | 'experience'>('monitor');
  const [publicViewMode, setPublicViewMode] = useState<'monitor' | 'experience'>('monitor');
  const location = useLocation();
  const navigate = useNavigate();
  const [simulatedStudentId, setSimulatedStudentId] = useState<string | null>(null);
  const [simulatedMemberId, setSimulatedMemberId] = useState<string | null>(null);
  const [simLoading, setSimLoading] = useState(false);

  // Redirect students away from dashboard to their course(s)
  useEffect(() => {
    if (profileLoading || !profile) return;
    const isLeadership = profile.is_super_admin || profile.is_admin ||
    profile.role === 'super-admin' || profile.role === 'admin';
    if (profile.role === 'student' && !isLeadership) {
      navigate('/course-selection', { replace: true });
    }
  }, [profile, profileLoading, navigate]);

  // First-time onboarding: if this tenant admin hasn't completed site setup,
  // send them to /admin/site-setup before they land on the dashboard.
  useEffect(() => {
    if (profileLoading || brandingLoading || !profile) return;
    const isAdmin = profile.is_super_admin || profile.is_admin || profile.role === 'super-admin' || profile.role === 'admin';
    if (!isAdmin) return;
    if (branding.setup_completed) return;
    if (location.pathname === '/admin/site-setup') return;
    if (location.pathname === '/control-center' || location.pathname === '/dashboard') {
      navigate('/admin/site-setup', { replace: true });
    }
  }, [profile, profileLoading, branding, brandingLoading, location.pathname, navigate]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const moduleId = params.get('module');
    setActiveModuleId(moduleId ? moduleId : null);
  }, [location.search]);

  // Listen for toggle-messages event from UniversalHeader
  useEffect(() => {
    const handleToggleMessages = () => setShowMessages((prev) => !prev);
    window.addEventListener('toggle-messages', handleToggleMessages);
    return () => window.removeEventListener('toggle-messages', handleToggleMessages);
  }, []);

  // Determine view mode based on current route
  const viewMode = useMemo(() => {
    const path = location.pathname.replace(/\/+$/, ''); // strip trailing slashes
    if (path === '/dashboard/member') return 'member';
    if (path === '/dashboard/student') return 'student';
    if (path === '/dashboard/fan') return 'fan';
    if (path === '/dashboard/mus240') return 'mus240';
    if (path === '/dashboard/public') return 'public';
    // /control-center is the super-admin landing — show the dedicated dashboard
    if (path === '/control-center') return 'control';
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
    const hideBackButton = activeModuleId === 'tour-management';
    return <div className="min-h-screen">
        <div className={hideBackButton ? '' : 'px-1 py-1 sm:px-6 sm:py-4'}>
          {!hideBackButton &&
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="mb-2 sm:mb-4 hover:bg-primary/10">
              <ArrowLeft className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline bg-primary">Back to Dashboard</span>
              <span className="sm:hidden">Back</span>
            </Button>
        }
          <ModuleDisplay selectedModule={activeModuleId} />
        </div>
        {showMemberNav && profile && <div className="px-1 sm:px-6 pb-4 sm:pb-8">
            <Suspense fallback={<div className="h-32 bg-muted animate-pulse rounded" />}>
              <MemberNavigation user={{
            id: profile.user_id,
            email: profile.email,
            full_name: profile.full_name,
            role: profile.role,
            is_admin: profile.is_admin,
            is_super_admin: profile.is_super_admin
          }} />
            </Suspense>
          </div>}
      </div>;
  }

  // Super-admin / Admin control center (route: /control-center).
  // Renders the SuperAdminDashboard for full-permission users; everyone else
  // gets sent to their own role's landing via the redirect hook.
  if (viewMode === 'control') {
    if (profile?.is_super_admin || profile?.is_admin || profile?.role === 'super-admin' || profile?.role === 'admin') {
      // If a module is selected via ?module=X, render it inside the
      // control-center frame with a "Back to Control Center" button.
      if (activeModuleId && activeModuleId !== 'collapsed-toggle') {
        return <div className="min-h-screen">
            <div className="py-3 px-3 sm:py-4 sm:px-4 md:py-6 md:px-6 max-w-7xl mx-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/control-center')}
                className="mb-3"
              >
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Back to Control Center
              </Button>
              <ModuleDisplay selectedModule={activeModuleId} />
            </div>
          </div>;
      }
      // No module selected — show the ControlCenter index
      return <div className="min-h-screen">
          <div className="py-3 px-3 sm:py-4 sm:px-4 md:py-6 md:px-6 max-w-7xl mx-auto">
            <ControlCenter onModuleSelect={(moduleId) => {
              navigate(`/control-center?module=${moduleId}`);
            }} />
          </div>
        </div>;
    }
    // Non-admin somehow landed here — bounce to their own dashboard.
    return <div className="p-8 text-center text-muted-foreground">Control Center is super-admin only.</div>;
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
            created_at: new Date().toISOString()
          }} />
            <Suspense fallback={<div className="h-32 bg-muted animate-pulse rounded" />}>
              <MemberNavigation user={{
              id: profile.user_id,
              email: profile.email,
              full_name: profile.full_name,
              role: profile.role,
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
            {/* Both modes show the live landing now — monitor was a legacy admin */}
            <GleeWorldLanding />
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
  return <div className="bg-[hsl(40,10%,96%)]">
      {/* Advertising Hero - TOP OF DASHBOARD */}
      <div className="w-full">
        <AdvertisingHero />
      </div>

      {/* My Modules */}
      {user && <div className="w-full">
          <MyModules userProfile={{
        user_id: user.id,
        role: profile?.role,
        is_admin: profile?.is_admin,
        is_super_admin: profile?.is_super_admin
      }} />
        </div>}

      {/* YouTube Channel Slider */}
      <CollapsibleDashboardSection title="YouTube Channel" icon={<Youtube className="h-5 w-5 text-red-500" />}>
        <YouTubeChannelSlider />
      </CollapsibleDashboardSection>

      {/* News Feed */}
      <CollapsibleDashboardSection title="News Feed" icon={<Newspaper className="h-5 w-5 text-blue-400" />}>
        <NewsFeedSlider />
      </CollapsibleDashboardSection>

      {/* Scholarship Feed */}
      <CollapsibleDashboardSection title="Scholarship Feed" icon={<GraduationCap className="h-5 w-5 text-amber-400" />}>
        <ScholarshipFeedSlider />
      </CollapsibleDashboardSection>
      
      {/* Messages Panel Overlay */}
      {showMessages && <MessagesPanel onClose={() => setShowMessages(false)} />}
    </div>;
};