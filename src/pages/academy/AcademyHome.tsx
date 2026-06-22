// /academy — role dispatcher. Renders the teacher dashboard for
// instructors / admins and the student dashboard for everyone else. Both
// live inside the AcademyShell wrapper at the route level.

import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { useProfile } from '@/hooks/useProfile';

const InstructorConsole = lazy(() => import('@/pages/dashboard/InstructorConsole'));
const StudentAcademyDashboard = lazy(() => import('./StudentAcademyDashboard'));

export default function AcademyHome() {
  const { profile } = useProfile();
  const { isSuperAdmin, isAdmin, loading: roleLoading } = useUserRole();

  // Wait for the role hook to settle before dispatching. Otherwise the
  // first render uses null-profile defaults (everyone looks like a student),
  // we mount StudentAcademyDashboard, then on the next render flip to
  // InstructorConsole — that's the "flashes in then disappears" effect.
  if (roleLoading) {
    return (
      <div className="py-12 text-center">
        <Loader2 className="w-5 h-5 animate-spin inline text-muted-foreground" />
      </div>
    );
  }

  const isTeacher = isSuperAdmin() || isAdmin() || profile?.role === 'instructor';

  return (
    <Suspense fallback={
      <div className="py-12 text-center"><Loader2 className="w-5 h-5 animate-spin inline text-muted-foreground" /></div>
    }>
      {isTeacher ? <InstructorConsole /> : <StudentAcademyDashboard />}
    </Suspense>
  );
}
