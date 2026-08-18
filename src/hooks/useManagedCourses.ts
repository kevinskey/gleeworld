// useManagedCourses — courses the signed-in user may share into
// (admin: all active real courses; otherwise: courses they instruct).
// Client-side twin of the DB-side user_can_manage_course() gate.
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from './useUserRole';
import { fetchManagedCourses } from '@/lib/media/shareRecording';

export function useManagedCourses() {
  const { user } = useAuth();
  const { isAdmin, isSuperAdmin } = useUserRole();
  const privileged = isAdmin() || isSuperAdmin();
  return useQuery({
    queryKey: ['managed-courses', user?.id, privileged],
    enabled: !!user?.id,
    queryFn: () => fetchManagedCourses(supabase, user!.id, privileged),
  });
}
