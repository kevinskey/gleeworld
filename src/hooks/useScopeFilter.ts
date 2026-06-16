// useScopeFilter — shared between Music + Media Library headers.
// Lists the courses the signed-in user has access to (admin: all, others:
// instructed or enrolled) and exposes the currently selected scope. Pass
// scope.courseId into queries to filter rows; null means "platform only",
// undefined means "no filter" (i.e. everything the role lets you see).

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from './useUserRole';

export type ScopeKey = 'all' | 'platform' | string; // course UUID

export interface ScopeOption {
  key: ScopeKey;
  label: string;
}

export function useScopeFilter() {
  const { user } = useAuth();
  const { isSuperAdmin, isAdmin } = useUserRole();
  const isPrivileged = isSuperAdmin() || isAdmin();
  const [active, setActive] = useState<ScopeKey>('all');

  // Courses visible in the picker. Admins see every active class. Others
  // see only classes they instruct or are enrolled in.
  const { data: courses = [] } = useQuery({
    queryKey: ['scope-filter-courses', user?.id, isPrivileged],
    enabled: !!user?.id,
    queryFn: async () => {
      let q = supabase
        .from('gw_courses')
        .select('id, course_code, title')
        .eq('is_active', true)
        .eq('is_template', false)
        .order('course_code');
      if (!isPrivileged) {
        const { data: enrolled } = await supabase
          .from('gw_course_enrollments')
          .select('course_id')
          .eq('user_id', user!.id);
        const enrolledIds = (enrolled ?? []).map((e: any) => e.course_id);
        // Returns courses where the user is instructor OR enrolled.
        q = q.or(
          `instructor_id.eq.${user!.id},id.in.(${enrolledIds.length ? enrolledIds.join(',') : 'null'})`
        );
      }
      const { data } = await q;
      return (data ?? []) as Array<{ id: string; course_code: string; title: string }>;
    },
  });

  const options: ScopeOption[] = useMemo(
    () => [
      { key: 'all', label: 'All' },
      // "Platform" was the internal name for scores not tied to any class;
      // users had no idea what that meant. "Shared" reads as "things
      // everyone can use" — same scope, friendlier word.
      { key: 'platform', label: 'Shared' },
      // Show the human-readable course title instead of the code
      // (e.g. GWD110, TPL-CHOIR101). Fall back to the code only when a
      // course has no title set.
      ...courses.map((c) => ({ key: c.id, label: c.title?.trim() || c.course_code })),
    ],
    [courses],
  );

  // Translate the active key into a Supabase query filter directive.
  const applyFilter = <T extends { is: any; eq: any }>(query: T): T => {
    if (active === 'all') return query;
    if (active === 'platform') return query.is('course_id', null);
    return query.eq('course_id', active);
  };

  return { active, setActive, options, courses, applyFilter };
}
