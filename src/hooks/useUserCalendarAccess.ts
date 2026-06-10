import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';

interface CalendarAccess {
  enrolledCourseIds: string[];
  enrolledCalendarIds: string[];
  isAlumna: boolean;
  isFan: boolean;
  isMember: boolean;
  hasFullAccess: boolean;
  loading: boolean;
}

export const useUserCalendarAccess = () => {
  const { user } = useAuth();
  const { isAdmin, isExecutiveBoard, isMember: checkMember, isFan: checkFan, isAlumna: checkAlumna, loading: roleLoading } = useUserRole();
  const [access, setAccess] = useState<CalendarAccess>({
    enrolledCourseIds: [],
    enrolledCalendarIds: [],
    isAlumna: false,
    isFan: false,
    isMember: false,
    hasFullAccess: false,
    loading: true
  });

  useEffect(() => {
    const fetchAccess = async () => {
      if (!user || roleLoading) return;

      const hasFullAccess = isAdmin() || isExecutiveBoard();
      const isMemberRole = checkMember();
      const isFanRole = checkFan();
      const isAlumnaRole = checkAlumna();

      const enrolledCourseIds: string[] = [];
      const enrolledCalendarIds: string[] = [];

      try {
        const { data: enrollments } = await supabase
          .from('gw_course_enrollments')
          .select('course_id')
          .eq('user_id', user.id)
          .eq('enrollment_status', 'enrolled');

        (enrollments || []).forEach((row: { course_id: string | null }) => {
          if (row.course_id) {
            enrolledCourseIds.push(row.course_id);
          }
        });

        if (enrolledCourseIds.length > 0) {
          const { data: courses } = await supabase
            .from('gw_courses')
            .select('calendar_id')
            .in('id', enrolledCourseIds);

          (courses || []).forEach((row: { calendar_id: string | null }) => {
            if (row.calendar_id) {
              enrolledCalendarIds.push(row.calendar_id);
            }
          });
        }
      } catch (err) {
        console.error('Error fetching calendar access:', err);
      }

      setAccess({
        enrolledCourseIds,
        enrolledCalendarIds,
        isAlumna: isAlumnaRole,
        isFan: isFanRole,
        isMember: isMemberRole,
        hasFullAccess,
        loading: false
      });
    };

    fetchAccess();
    // The role-checker functions from useUserRole are recreated every render;
    // including them in deps caused a request storm (~60 fetches per page load).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, roleLoading]);

  return access;
};

// Helper to check if an event should be visible to a user
export const isEventVisibleToUser = (
  event: {
    is_public?: boolean | null;
    calendar_id?: string;
    course_id?: string | null;
    gw_calendars?: { name?: string } | null;
  },
  access: CalendarAccess
): boolean => {
  // Full access users (admin/exec) see everything
  if (access.hasFullAccess) {
    return true;
  }

  // Public events are visible to everyone
  if (event.is_public) {
    return true;
  }

  // Check calendar name for role-based access
  const calendarName = event.gw_calendars?.name?.toLowerCase() || '';

  // Graduates can see graduates events
  if (access.isAlumna && calendarName.includes('graduates')) {
    return true;
  }

  // Fans can see fan events
  if (access.isFan && calendarName.includes('fan')) {
    return true;
  }

  // Members see Glee Club events
  if (access.isMember && (
    calendarName.includes('glee') || 
    calendarName.includes('scgc') ||
    calendarName.includes('mus 070') ||
    calendarName.includes('main calendar')
  )) {
    return true;
  }

  // Enrolled students see their course calendars
  if (event.calendar_id && access.enrolledCalendarIds.includes(event.calendar_id)) {
    return true;
  }

  // Check by course_id for course-specific events
  if (event.course_id && access.enrolledCourseIds.includes(event.course_id)) {
    return true;
  }

  return false;
};
