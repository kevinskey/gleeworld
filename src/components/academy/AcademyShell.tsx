// AcademyShell — full-shell wrapper for the LMS environment. Different
// sidebar from DashboardShell: course-centric nav, role-aware items, and
// an explicit "Back to Workspace" exit. Shares workspace identity + user
// identity with the rest of the app via the same auth context.

import { ReactNode, useState } from 'react';
import { Link, NavLink, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useBrandingSettings } from '@/hooks/useBrandingSettings';
import { useUserRole } from '@/hooks/useUserRole';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  GraduationCap, Home, BookOpen, ClipboardCheck, BarChart3, Store, Award,
  LogOut, ChevronDown, User as UserIcon, ArrowLeft, Settings, Menu,
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

const NAV_BASE = 'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors w-full text-left';
const NAV_INACTIVE = 'text-foreground/80 hover:bg-muted hover:text-foreground';
const NAV_ACTIVE = 'bg-primary/10 text-primary font-semibold';

export function AcademyShell({ children }: { children: ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  return (
    <div className="flex min-h-screen bg-[var(--gw-cream,#fbf9f5)]">
      <AcademySidebar />
      <div className="flex-1 min-w-0">
        {/* Mobile topbar — the sidebar (with its Back to Workspace exit)
            is lg-only, so below lg every Academy page needs its own way
            out and into the academy nav. */}
        <div className="lg:hidden sticky top-0 z-30 flex items-center gap-1 h-12 px-2 bg-card border-b border-border">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 px-2 h-10 text-sm font-medium text-muted-foreground hover:text-foreground"
            aria-label="Back to Workspace"
          >
            <ArrowLeft className="w-4 h-4" /> Workspace
          </Link>
          <div className="flex-1 text-center text-sm font-semibold inline-flex items-center justify-center gap-1.5 min-w-0">
            <GraduationCap className="w-4 h-4 text-primary shrink-0" /> Academy
          </div>
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger asChild>
              <button
                className="w-11 h-11 inline-flex items-center justify-center rounded-full hover:bg-muted transition"
                aria-label="Open Academy navigation"
              >
                <Menu className="w-5 h-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[85vw] max-w-xs">
              {/* Close on any nav click so the page changes are visible */}
              <div className="h-full" onClick={(e) => {
                const t = e.target as HTMLElement;
                if (t.closest('a')) setMobileNavOpen(false);
              }}>
                <AcademySidebar inSheet />
              </div>
            </SheetContent>
          </Sheet>
        </div>
        {children}
      </div>
    </div>
  );
}

function AcademySidebar({ inSheet = false }: { inSheet?: boolean } = {}) {
  const { user, signOut } = useAuth();
  const { userProfile } = useUserProfile(user);
  const { settings: branding } = useBrandingSettings();
  const { isSuperAdmin, isAdmin } = useUserRole();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const isTeacher = isSuperAdmin() || isAdmin() || userProfile?.role === 'instructor';
  const tenantName = branding?.org_name || branding?.short_name || 'Workspace';

  // Live course list for the nav.
  const { data: courses = [] } = useQuery({
    queryKey: ['academy-shell-courses', user?.id, isTeacher],
    enabled: !!user?.id,
    queryFn: async () => {
      if (isTeacher) {
        // Teachers see all courses in their tenant that they own or instruct.
        const { data } = await supabase
          .from('gw_courses')
          .select('id, course_code, title')
          .eq('is_active', true)
          .order('course_code');
        return data ?? [];
      }
      // Students see enrolled courses.
      const { data } = await supabase
        .from('gw_course_enrollments')
        .select('course_id, gw_courses!inner(id, course_code, title)')
        .eq('user_id', user!.id)
        .in('enrollment_status', ['enrolled', 'active', 'in_progress', 'registered']);
      return (data ?? []).map((e: any) => e.gw_courses).filter(Boolean);
    },
  });

  const displayName = userProfile?.full_name || user?.email || 'Account';
  const initials = displayName.split(/\s+/).map((n: string) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'U';

  return (
    <aside className={inSheet ? 'flex flex-col w-full h-full bg-card' : 'hidden lg:flex flex-col w-64 shrink-0 border-r border-border bg-card h-screen sticky top-0'}>
      {/* Workspace pill (top) */}
      <Link to="/dashboard" className="flex items-center gap-2.5 px-4 h-14 border-b border-border hover:bg-muted/40 transition group">
        <GraduationCap className="w-5 h-5 text-primary shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Academy</div>
          <div className="text-xs font-semibold truncate">{tenantName}</div>
        </div>
      </Link>

      {/* Exit affordance */}
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-2 px-4 py-2.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition border-b border-border"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Workspace
      </button>

      {/* Nav */}
      <nav className={`flex-1 overflow-y-auto pt-3 px-3 space-y-0.5 ${inSheet ? 'pb-[calc(env(safe-area-inset-bottom)+6rem)]' : 'pb-3'}`}>
        {/* Primary */}
        <NavLink to="/academy" end className={({ isActive }) => `${NAV_BASE} ${isActive ? NAV_ACTIVE : NAV_INACTIVE}`}>
          <Home className="w-4 h-4" />
          <span>Dashboard</span>
        </NavLink>

        {isTeacher ? (
          <>
            <NavLink to="/academy/grading" className={({ isActive }) => `${NAV_BASE} ${isActive ? NAV_ACTIVE : NAV_INACTIVE}`}>
              <ClipboardCheck className="w-4 h-4" />
              <span>Grading Queue</span>
            </NavLink>
            <NavLink to="/academy/reports" className={({ isActive }) => `${NAV_BASE} ${isActive ? NAV_ACTIVE : NAV_INACTIVE}`}>
              <BarChart3 className="w-4 h-4" />
              <span>Reports</span>
            </NavLink>
            <NavLink to="/academy/store" className={({ isActive }) => `${NAV_BASE} ${isActive ? NAV_ACTIVE : NAV_INACTIVE}`}>
              <Store className="w-4 h-4" />
              <span>Course Store</span>
            </NavLink>
          </>
        ) : (
          <NavLink to="/academy/grades" className={({ isActive }) => `${NAV_BASE} ${isActive ? NAV_ACTIVE : NAV_INACTIVE}`}>
            <Award className="w-4 h-4" />
            <span>Grades</span>
          </NavLink>
        )}

        {/* Course list — each course as a top-level item, color-coded */}
        {courses.length > 0 && (
          <div className="pt-3 mt-3 border-t border-border space-y-0.5">
            <div className="px-3 py-1 text-xs uppercase tracking-widest text-muted-foreground font-semibold flex items-center justify-between">
              {isTeacher ? 'My Courses' : 'My Classes'}
              <span>{courses.length}</span>
            </div>
            {courses.map((c: any, i: number) => (
              <NavLink
                key={c.id}
                to={`/academy/c/${(c.course_code || '').toLowerCase()}`}
                className={({ isActive }) => `${NAV_BASE} ${isActive ? NAV_ACTIVE : NAV_INACTIVE} text-xs`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: COURSE_PALETTE[i % COURSE_PALETTE.length] }}
                />
                <span className="truncate">{c.course_code || c.title}</span>
              </NavLink>
            ))}
          </div>
        )}
      </nav>

      {/* User pill (bottom) */}
      <div className="border-t border-border p-3 relative">
        <button
          onClick={() => setShowUserMenu((s) => !s)}
          className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-muted transition"
        >
          <Avatar className="w-7 h-7">
            <AvatarImage src={userProfile?.avatar_url || (user?.user_metadata as any)?.avatar_url} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 text-left">
            <div className="text-xs font-semibold truncate">{displayName}</div>
            <div className="text-xs text-muted-foreground truncate">{isTeacher ? 'Teacher' : 'Student'}</div>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        </button>

        {showUserMenu && (
          <div className="absolute bottom-full left-3 right-3 mb-1 rounded-lg border border-border bg-popover shadow-lg overflow-hidden">
            <button
              onClick={() => { setShowUserMenu(false); navigate('/profile'); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted transition"
            >
              <UserIcon className="w-3.5 h-3.5" /> Profile
            </button>
            <button
              onClick={() => { setShowUserMenu(false); navigate('/settings'); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted transition"
            >
              <Settings className="w-3.5 h-3.5" /> Settings
            </button>
            <div className="border-t border-border" />
            <button
              onClick={async () => { setShowUserMenu(false); await signOut(); navigate('/'); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted transition text-rose-600"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

const COURSE_PALETTE = ['#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444'];

export default AcademyShell;
