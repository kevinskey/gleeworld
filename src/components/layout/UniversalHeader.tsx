import { useState, useMemo, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { LogOut, User, Settings, Menu, Home, Camera, Crown, Globe, Heart, GraduationCap, Music, Search, Plus, Mail, Key, CalendarDays, Landmark, Radio } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useMessenger } from "@/contexts/MessengerContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { usePageTitle } from "@/hooks/usePageTitle";
import { AppNavigation } from "@/components/navigation/AppNavigation";
import { useTheme } from "@/contexts/ThemeContext";
import { DashboardSwitcher } from "@/components/navigation/DashboardSwitcher";
import { useIsMobile } from "@/hooks/use-mobile";
import { EnhancedTooltip } from "@/components/ui/enhanced-tooltip";
import { HeaderRadioControls } from "@/components/radio/HeaderRadioControls";
import { DynamicCountdownText } from "@/components/ui/DynamicCountdownText";
import { MusicalToolkit } from "@/components/musical-toolkit/MusicalToolkit";
import { ExecutiveBoardDropdown } from "@/components/navigation/ExecutiveBoardDropdown";
import { QuickCaptureCategorySelector, QuickCaptureCategory } from "@/components/quick-capture/QuickCaptureCategorySelector";
import { CategorizedQuickCapture } from "@/components/quick-capture/CategorizedQuickCapture";
import { QuickActionsPanel } from "@/components/dashboard/QuickActionsPanel";
import { useMemberQuickActions } from "@/hooks/useMemberQuickActions";

import { LandingPageModal } from "@/components/landing/LandingPageModal";

interface UniversalHeaderProps {
  viewMode?: 'admin' | 'member';
  onViewModeChange?: (mode: 'admin' | 'member') => void;
}
export const UniversalHeader = ({
  viewMode,
  onViewModeChange
}: UniversalHeaderProps) => {
  const {
    user,
    signOut
  } = useAuth();
  const {
    toggleMessenger,
    isOpen: isMessengerOpen
  } = useMessenger();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const location = useLocation();
  const {
    userProfile
  } = useUserProfile(user);
  const {
    pageName
  } = usePageTitle();
  const {
    themeName
  } = useTheme();

  // Fetch courses for Institute dropdown
  const isStudentRole = userProfile?.role === 'student' && !userProfile?.is_admin && !userProfile?.is_super_admin;
  
  const {
    data: courses = []
  } = useQuery({
    queryKey: ['glee-academy-courses-header', user?.id, isStudentRole],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from('gw_courses').select('id, title, course_code').eq('is_active', true).order('title', {
        ascending: true
      });
      if (error) throw error;
      const allCourses = data || [];
      
      // For students, filter to only enrolled courses
      if (isStudentRole && user) {
        const { data: enrollments } = await supabase
          .from('gw_course_enrollments')
          .select('course_id')
          .eq('user_id', user.id)
          .eq('enrollment_status', 'enrolled');
        
        if (enrollments && enrollments.length > 0) {
          const enrolledIds = new Set(enrollments.map(e => e.course_id));
          return allCourses.filter(c => enrolledIds.has(c.id));
        }
        return [];
      }
      
      return allCourses;
    }
  });

  // Quick Capture state
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<QuickCaptureCategory | null>(null);

  // Quick Actions state
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  
  // Landing Page Modal state
  const [isLandingModalOpen, setIsLandingModalOpen] = useState(false);
  const {
    quickActions: memberQuickActions,
    loading: quickActionsLoading,
    canUseQuickActions,
    addQuickAction,
    removeQuickAction,
    reorderQuickActions,
    isInQuickActions
  } = useMemberQuickActions(user?.id, userProfile?.role || 'member');

  // Memoize quickActions prop
  const memoizedQuickActions = useMemo(() => {
    if (!canUseQuickActions) return undefined;
    return {
      quickActions: memberQuickActions,
      addQuickAction,
      removeQuickAction,
      reorderQuickActions,
      isInQuickActions
    };
  }, [canUseQuickActions, memberQuickActions, addQuickAction, removeQuickAction, reorderQuickActions, isInQuickActions]);

  // Role-based accent colors for header branding — now a top border accent
  const getRoleAccentBorder = () => {
    const role = userProfile?.role;
    if (userProfile?.is_super_admin) return 'border-t-2 border-t-red-500';
    if (userProfile?.is_admin || userProfile?.is_exec_board) return 'border-t-2 border-t-purple-500';
    switch (role) {
      case 'student':
        return 'border-t-2 border-t-emerald-500';
      case 'alumna':
        return 'border-t-2 border-t-amber-500';
      case 'fan':
        return 'border-t-2 border-t-sky-500';
      case 'auditioner':
        return 'border-t-2 border-t-yellow-500';
      default:
        return '';
    }
  };
  const getRoleBadgeLabel = () => {
    if (userProfile?.is_super_admin) return 'Super Admin';
    if (userProfile?.is_admin) return 'Admin';
    if (userProfile?.is_exec_board) return userProfile?.exec_board_role?.replace(/_/g, ' ') || 'Executive';
    switch (userProfile?.role) {
      case 'student':
        return 'Student';
      case 'alumna':
        return 'Alumna';
      case 'fan':
        return 'Fan';
      case 'auditioner':
        return 'Auditioner';
      default:
        return null;
    }
  };

  // Check if user has PR access (PR coordinator or admin)
  const isAdmin = userProfile?.is_admin === true || userProfile?.is_super_admin === true || userProfile?.is_exec_board === true;
  const isPRCoordinator = userProfile?.exec_board_role === 'pr_coordinator';
  const canAccessPR = isAdmin || isPRCoordinator;
  const isExecBoardMember = userProfile?.exec_board_role && userProfile.exec_board_role.trim() !== '';
  const hasExecBoardPerms = isAdmin || isExecBoardMember;

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const headerRef = useRef<HTMLElement | null>(null);
  const lastHeaderHeightRef = useRef<number>(0);
  const isInitializedRef = useRef(false);
  useEffect(() => {
    const update = (force = false) => {
      const el = headerRef.current;
      if (!el) return;
      const baseHeight = Math.round(el.getBoundingClientRect().height);
      if (!force && isInitializedRef.current && Math.abs(baseHeight - lastHeaderHeightRef.current) <= 2) {
        return;
      }
      lastHeaderHeightRef.current = baseHeight;
      document.documentElement.style.setProperty('--gw-header-base-h', `${baseHeight}px`);
      document.documentElement.style.setProperty('--gw-header-h', `calc(var(--gw-header-base-h) + var(--gw-safe-top))`);
      document.documentElement.style.setProperty('--gw-header-height', `calc(var(--gw-header-base-h) + var(--gw-safe-top))`);
      isInitializedRef.current = true;
    };
    update(true);
    const handleResize = () => update(true);
    window.addEventListener('resize', handleResize);
    const safeTopRecheck = window.setTimeout(() => update(true), 250);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.clearTimeout(safeTopRecheck);
    };
  }, []);

  // Icon button style — compact, clear
  const iconBtn = "h-8 w-8 p-0 rounded-full hover:bg-[hsl(var(--spelman-navy))]/10 transition-colors text-[hsl(var(--spelman-navy))]";
  const iconSize = "h-[18px] w-[18px]";

  // Desktop icon button — slightly larger
  const deskIconBtn = "sm:h-9 sm:w-9";
  const deskIconSize = "sm:h-5 sm:w-5";

  return (
    <>
      <div
        className="w-full m-0 p-0 fixed top-0 left-0 right-0 z-50 overflow-hidden pointer-events-none"
        style={{ top: 'var(--gw-safe-top)' }}
      >
        <div className="w-full max-w-7xl lg:max-w-full mx-auto pointer-events-auto py-0">
        <header
          ref={headerRef}
          className={`
            w-full relative
            bg-white/95 backdrop-blur-md
            border-b border-slate-200
            shadow-[0_1px_3px_rgba(0,0,0,0.08)]
            ${user ? getRoleAccentBorder() : ''}
          `.trim().replace(/\s+/g, ' ')}
        >
          <div className="flex items-center justify-between w-full h-11 sm:h-12 md:h-11 px-2 sm:px-3 md:px-4 lg:px-6">
            {/* Left: Logo + Brand */}
            <Link to="/" className="flex items-center gap-1.5 flex-shrink-0 hover:opacity-80 transition-opacity">
              <img
                src="/gleeworld-door-icon.png?v=2"
                alt="GleeWorld"
                className="w-7 h-7 sm:w-8 sm:h-8 object-contain"
              />
              <span
                style={{
                  fontFamily: "'Cinzel', serif",
                  letterSpacing: '0.03em',
                }}
                className="text-base sm:text-lg md:text-xl font-semibold text-[hsl(var(--spelman-navy))] whitespace-nowrap"
              >
                GleeWorld
              </span>
            </Link>

            {/* Center: Countdown (tablet/desktop only) */}
            <div className="hidden sm:flex items-center">
              <DynamicCountdownText className="text-xs bg-slate-100 text-slate-600 border-0" />
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-0.5 sm:gap-1 md:gap-1.5">
              {/* Radio — always visible, compact */}
              <HeaderRadioControls />

              {/* Mail — hidden on mobile (in bottom nav) */}
              {user && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/messenger')}
                  className={`hidden sm:flex ${iconBtn} ${deskIconBtn}`}
                  type="button"
                  title="Messages"
                >
                  <Mail className={`${iconSize} ${deskIconSize}`} />
                </Button>
              )}

              {/* Calendar — hidden on mobile */}
              {user && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/calendar')}
                  className={`hidden sm:flex ${iconBtn} ${deskIconBtn}`}
                  type="button"
                  title="Calendar"
                >
                  <CalendarDays className={`${iconSize} ${deskIconSize}`} />
                </Button>
              )}

              {/* Musical Toolkit — hidden on mobile */}
              <div className="hidden md:block">
                <MusicalToolkit />
              </div>

              {/* Academy — hidden on small screens */}
              {user && (
                <div className="hidden md:block">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`${iconBtn} ${deskIconBtn}`}
                        type="button"
                        title="Glee Academy"
                      >
                        <Landmark className={`${iconSize} ${deskIconSize}`} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64 bg-white border border-slate-200 shadow-xl z-[100] text-slate-900">
                      <DropdownMenuItem onClick={() => navigate('/glee-academy')} className="cursor-pointer font-medium">
                        <Landmark className="w-4 h-4 mr-2" />
                        Glee Academy Home
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="text-xs text-slate-500">Courses</DropdownMenuLabel>
                      {courses.map(course => (
                        <DropdownMenuItem
                          key={course.id}
                          onClick={() => {
                            if (course.course_code === 'MUS 000') {
                              window.open('https://readmusic.gleeworld.org', '_blank');
                            } else {
                              navigate(`/academy/${course.course_code?.toLowerCase().replace(' ', '-')}`);
                            }
                          }}
                          className="cursor-pointer"
                        >
                          <span className="text-xs text-slate-400 mr-2">{course.course_code}</span>
                          {course.title}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}

              {/* Super Admin Dashboard Switcher */}
              {user && userProfile?.is_super_admin && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`hidden sm:flex ${iconBtn} ${deskIconBtn}`}
                      type="button"
                      title="Switch Dashboard"
                    >
                      <Crown className={`${iconSize} ${deskIconSize}`} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-white border border-slate-200 shadow-xl z-[100] text-slate-900">
                    <DropdownMenuLabel className="text-xs text-slate-500">Quick Access</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {isAdmin && (
                      <DropdownMenuItem onClick={() => navigate('/dashboard')} className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" /> My Dashboard
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => navigate('/dashboard/member')} className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" /> Member
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/dashboard/student')} className="cursor-pointer">
                      <GraduationCap className="mr-2 h-4 w-4" /> Student
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/dashboard/fan')} className="cursor-pointer">
                      <Heart className="mr-2 h-4 w-4" /> Fan
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/alumnae')} className="cursor-pointer">
                      <GraduationCap className="mr-2 h-4 w-4" /> Alumnae
                    </DropdownMenuItem>
                    {hasExecBoardPerms && (
                      <DropdownMenuItem onClick={() => navigate('/admin')} className="cursor-pointer">
                        <Crown className="mr-2 h-4 w-4" /> Admin
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs text-slate-500">Public Pages</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => setIsLandingModalOpen(true)} className="cursor-pointer">
                      <Globe className="mr-2 h-4 w-4" /> Landing Page
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { navigate('/glee-academy'); window.scrollTo(0, 0); }} className="cursor-pointer">
                      <GraduationCap className="mr-2 h-4 w-4" /> Glee Academy
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/dashboard/public')} className="cursor-pointer">
                      <Globe className="mr-2 h-4 w-4" /> Public View
                    </DropdownMenuItem>
                    {hasExecBoardPerms && (
                      <>
                        <DropdownMenuSeparator />
                        <ExecutiveBoardDropdown />
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Add Module — hidden on mobile */}
              {!hasExecBoardPerms && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/dashboard/member?addModule=true')}
                  className={`hidden sm:flex ${iconBtn} ${deskIconBtn}`}
                  type="button"
                  title="Add Module"
                >
                  <Plus className={`${iconSize} ${deskIconSize}`} />
                </Button>
              )}

              {/* Camera — hidden on mobile (in bottom nav) */}
              <div className="hidden sm:block">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowCategorySelector(true);
                  }}
                  className={`${iconBtn} ${deskIconBtn}`}
                  type="button"
                  title="Glee Cam"
                >
                  <Camera className={`${iconSize} ${deskIconSize}`} />
                </Button>
              </div>

              {/* Quick Actions */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsQuickActionsOpen(prev => !prev)}
                className={`${iconBtn} ${deskIconBtn}`}
                type="button"
                title="Quick Access"
              >
                <Key className={`${iconSize} ${deskIconSize}`} />
              </Button>

              {/* Avatar / Profile Menu */}
              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 sm:h-9 sm:w-9 rounded-full p-0 hover:ring-2 hover:ring-slate-300 transition-all" type="button">
                      <Avatar className="h-7 w-7 sm:h-8 sm:w-8 border border-slate-200">
                        <AvatarImage
                          src={userProfile?.avatar_url || undefined}
                          alt={userProfile?.full_name || user?.email || "Profile"}
                          className="object-cover"
                          onError={e => { e.currentTarget.style.display = 'none'; }}
                        />
                        <AvatarFallback className="bg-[hsl(var(--spelman-navy))] text-white font-bold text-xs">
                          {userProfile?.full_name ? userProfile.full_name.split(' ').map(n => n[0]).join('').toUpperCase() : user?.email?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-white border border-slate-200 shadow-xl z-[100] text-slate-900">
                    <div className="flex flex-col space-y-1 p-2">
                      <p className="text-sm font-medium leading-none truncate text-slate-900">
                        {userProfile?.full_name || user.email}
                      </p>
                      <p className="text-xs leading-none text-slate-500">
                        {user.email}
                      </p>
                      {getRoleBadgeLabel() && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium w-fit mt-1 ${
                          userProfile?.is_super_admin ? 'bg-red-100 text-red-700' :
                          userProfile?.is_admin ? 'bg-purple-100 text-purple-700' :
                          userProfile?.is_exec_board ? 'bg-blue-100 text-blue-700' :
                          userProfile?.role === 'student' ? 'bg-emerald-100 text-emerald-700' :
                          userProfile?.role === 'alumna' ? 'bg-amber-100 text-amber-700' :
                          userProfile?.role === 'fan' ? 'bg-sky-100 text-sky-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {getRoleBadgeLabel()}
                        </span>
                      )}
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link to="/profile" className="flex items-center">
                        <User className="mr-2 h-4 w-4" /> Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link to="/settings" className="flex items-center">
                        <Settings className="mr-2 h-4 w-4" /> Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-red-600">
                      <LogOut className="mr-2 h-4 w-4" /> Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {!user && (
                <Button asChild variant="default" size="sm" className="text-xs px-3 h-8 whitespace-nowrap bg-[hsl(var(--spelman-navy))] hover:bg-[hsl(var(--spelman-navy))]/90 text-white">
                  <Link to="/auth">Sign In</Link>
                </Button>
              )}
            </div>
          </div>
        </header>
        </div>
      </div>

      {/* Quick Capture Category Selector */}
      <QuickCaptureCategorySelector open={showCategorySelector} onClose={() => setShowCategorySelector(false)} onSelectCategory={category => {
        setShowCategorySelector(false);
        setSelectedCategory(category);
      }} />

      {/* Categorized Quick Capture */}
      {selectedCategory && <CategorizedQuickCapture category={selectedCategory} onClose={() => setSelectedCategory(null)} onBack={() => {
        setSelectedCategory(null);
        setShowCategorySelector(true);
      }} />}

      {/* Quick Actions Panel */}
      {user && <QuickActionsPanel user={{
        id: user.id,
        email: user.email || '',
        full_name: userProfile?.full_name || user.email || '',
        role: userProfile?.role || 'student',
        exec_board_role: userProfile?.exec_board_role || undefined,
        is_exec_board: userProfile?.is_exec_board || false
      }} onModuleSelect={moduleId => {
        navigate(`/dashboard?module=${moduleId}`);
        setIsQuickActionsOpen(false);
      }} isOpen={isQuickActionsOpen} onClose={() => setIsQuickActionsOpen(false)} quickActions={memoizedQuickActions} />}

      {/* Landing Page Modal */}
      <LandingPageModal 
        open={isLandingModalOpen} 
        onOpenChange={setIsLandingModalOpen} 
      />
    </>
  );
};
