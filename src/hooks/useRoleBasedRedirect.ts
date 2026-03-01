
import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { supabase } from "@/integrations/supabase/client";

export const useRoleBasedRedirect = () => {
  const { user, loading } = useAuth();
  const { userProfile } = useUserProfile(user);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.log('🔍 useRoleBasedRedirect: Effect triggered', {
      loading,
      hasUser: !!user,
      hasUserProfile: !!userProfile,
      userRole: userProfile?.role,
      isAdmin: userProfile?.is_admin,
      isSuperAdmin: userProfile?.is_super_admin,
      isExecBoard: userProfile?.is_exec_board,
      execBoardRole: userProfile?.exec_board_role,
      verified: userProfile?.verified,
      pathname: location.pathname,
      timestamp: new Date().toISOString()
    });

    // Early return if still loading
    if (loading) {
      console.log('🔍 useRoleBasedRedirect: Still loading auth or profile');
      return;
    }

    // If no user, don't redirect (let them stay on public pages)
    if (!user) {
      console.log('useRoleBasedRedirect: No user found');
      return;
    }

    // If user exists but no profile after loading is complete, send to onboarding
    // BUT only if they're not trying to view public pages
    if (!userProfile) {
      console.log('useRoleBasedRedirect: User exists but no profile found');
      
      // Allow users to stay on public pages even without a profile
      const publicPages = ['/', '/about', '/events', '/contact', '/shop', '/calendar', '/press-kit'];
      const isOnPublicPage = publicPages.includes(location.pathname);
      
      // Allow academy/course pages without requiring profile completion
      const isOnAcademyPage = location.pathname.startsWith('/academy') || 
                              location.pathname.startsWith('/classes/mus240') ||
                              location.pathname.startsWith('/grading');
      
      if (!isOnPublicPage && !isOnAcademyPage && location.pathname !== '/onboarding') {
        console.log('useRoleBasedRedirect: Not on public page, redirecting to onboarding');
        navigate('/onboarding', { replace: true });
      } else if (isOnPublicPage || isOnAcademyPage) {
        console.log('useRoleBasedRedirect: On public/academy page, allowing access without profile');
      }
      return;
    }

    // Check if profile is incomplete (missing required onboarding fields)
    const isProfileIncomplete = !userProfile.first_name || 
                               !userProfile.last_name || 
                               !userProfile.phone || 
                               !userProfile.address;

    // Check if user is leadership (admin, super admin, or exec board)
    const isLeadership = userProfile.is_super_admin || 
                        userProfile.is_admin || 
                        userProfile.is_exec_board || 
                        userProfile.role === 'super-admin' || 
                        userProfile.role === 'admin';

    if (isProfileIncomplete) {
      console.log('🔄 useRoleBasedRedirect: Profile incomplete detected');
      
      // Allow leadership to access protected areas even with incomplete profiles
      // They'll see a banner instead of being forced to onboarding
      if (isLeadership) {
        console.log('👑 useRoleBasedRedirect: Leadership with incomplete profile, allowing access');
        return;
      }

      // For non-leadership, only redirect to onboarding if they're trying to access protected routes
      const protectedRoutes = ['/dashboard', '/member', '/fan', '/alumnae', '/admin'];
      const isAccessingProtectedRoute = protectedRoutes.some(route => location.pathname.startsWith(route));
      
      if (isAccessingProtectedRoute && location.pathname !== '/onboarding') {
        console.log('🔄 useRoleBasedRedirect: Non-leadership accessing protected route, redirecting to onboarding');
        navigate('/onboarding', { replace: true });
        return;
      }
      
      // Allow staying on public pages with incomplete profile
      console.log('🌐 useRoleBasedRedirect: Incomplete profile but on public page, allowing access');
    }

    // Check if user is in executive board table
    const checkExecutiveStatus = async () => {
      const { data: execData } = await supabase
        .from('gw_executive_board_members')
        .select('position, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();
      
      console.log('useRoleBasedRedirect: Executive board data from table:', execData);
      return execData;
    };

    // Don't redirect if user is already on a specific page they navigated to
    const isOnAuthPage = location.pathname === '/auth';
    const isOnRootPage = location.pathname === '/';

    // Respect explicit request to view public home (from header click)
    const forcePublic = sessionStorage.getItem('force-public-view') === '1';
    if (isOnRootPage && forcePublic) {
      console.log('🛑 useRoleBasedRedirect: Force public view enabled, skipping auto-redirect');
      sessionStorage.removeItem('force-public-view');
      return;
    }
    
    // Also skip redirect if user is already on their target dashboard
    const isOnTargetPage = location.pathname.includes('/admin') || 
                          location.pathname.includes('/dashboard') || 
                          location.pathname.includes('/control-center') ||
                          location.pathname.includes('/fan') || 
                          location.pathname.includes('/alumnae') ||
                          location.pathname.startsWith('/classes/mus240') ||
                          location.pathname.startsWith('/academy') ||
                          location.pathname.startsWith('/grading');
    
    // Students on /dashboard should still be redirected away
    const isStudentOnDashboard = userProfile.role === 'student' && !isLeadership && location.pathname.includes('/dashboard');
    if (!isOnAuthPage && !isOnRootPage && isOnTargetPage && !isStudentOnDashboard) {
      console.log('useRoleBasedRedirect: Already on target page, skipping redirect');
      return;
    }

    // Streamlined redirect logic with admin priority
    const handleRedirect = async () => {
      // Check if this is coming from auth/login (sessionStorage indicator)
      const redirectAfterAuth = sessionStorage.getItem('redirectAfterAuth');
      const isPostLogin = redirectAfterAuth !== null || location.pathname === '/auth';
      
      // Don't redirect if user is on MUS 240 pages, academy, or other specific areas
      // NOTE: Students on /dashboard should NOT be blocked - they need to be redirected away
      const isStudentRole = userProfile.role === 'student' && !isLeadership;
      if (location.pathname.startsWith('/classes/mus240') || 
          location.pathname.startsWith('/academy') ||
          location.pathname.startsWith('/grading') ||
          location.pathname.startsWith('/admin') ||
          location.pathname.startsWith('/control-center') ||
          (location.pathname.includes('/dashboard') && !isStudentRole)) {
        console.log('🛑 useRoleBasedRedirect: User on specific area, not redirecting');
        return;
      }
      
      // For public pages other than root, don't auto-redirect unless coming from auth
      if (!isPostLogin) {
        if (!isOnRootPage) {
          console.log('🏠 useRoleBasedRedirect: User on public page (not root), not redirecting automatically');
          return;
        } else {
          console.log('🚀 useRoleBasedRedirect: Authenticated user on root, redirecting to role-based home');
        }
      }

      // PRIORITY 1: Super Admin -> Control Center  
      if (userProfile.is_super_admin || userProfile.role === 'super-admin') {
        console.log('🚀 useRoleBasedRedirect: Super Admin redirect to /control-center');
        navigate('/control-center', { replace: true });
        return;
      }

      // PRIORITY 2: Admin or Executive Board -> Admin Panel
      if (userProfile.is_admin || userProfile.role === 'admin' || userProfile.is_exec_board) {
        console.log('🚀 useRoleBasedRedirect: Admin/Executive redirect to /dashboard');
        navigate('/dashboard', { replace: true });
        return;
      }

      // (Removed dedicated executive board dashboard)


      // PRIORITY 4: Alumna
      if (userProfile.role === 'alumna') {
        console.log('🎓 useRoleBasedRedirect: Alumna redirect to /alumnae');
        navigate('/alumnae', { replace: true });
        return;
      }
      
      // PRIORITY 5: Fans  
      if (userProfile.role === 'fan') {
        console.log('🎵 useRoleBasedRedirect: Fan redirect to /fan');
        navigate('/fan', { replace: true });
        return;
      }
      
      // PRIORITY 6: Students -> course home or course selection
      if (userProfile.role === 'student') {
        console.log('👤 useRoleBasedRedirect: Student - checking enrollments');
        try {
          const { data: enrollments } = await supabase
            .from('gw_course_enrollments')
            .select('course_id')
            .eq('user_id', user.id)
            .eq('enrollment_status', 'enrolled');
          
          if (enrollments && enrollments.length === 1) {
            // Single enrollment - go directly to that course
            const { ACADEMY_COURSES } = await import('@/config/academyCourses');
            const course = ACADEMY_COURSES.find(c => c.id === enrollments[0].course_id);
            if (course) {
              console.log('🎓 useRoleBasedRedirect: Student enrolled in 1 course, redirecting to', course.route);
              navigate(course.route, { replace: true });
              return;
            }
          } else if (enrollments && enrollments.length > 1) {
            console.log('🎓 useRoleBasedRedirect: Student enrolled in multiple courses, showing selection');
            navigate('/course-selection', { replace: true });
            return;
          }
        } catch (err) {
          console.error('useRoleBasedRedirect: Error checking enrollments:', err);
        }
        // Fallback: no enrollments or error - send to course selection (not dashboard)
        navigate('/course-selection', { replace: true });
        return;
      }
      
      // PRIORITY 5: Default fallback - NO AUTOMATIC REDIRECT
      console.log('👤 useRoleBasedRedirect: No matching role, staying on current page');
      return;
    };

    handleRedirect();
  }, [user, userProfile, loading, navigate, location.pathname]);

  return { userProfile, loading };
};
