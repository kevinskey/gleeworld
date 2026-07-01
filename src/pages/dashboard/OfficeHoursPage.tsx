// Office Hours — Calendly-style workshop for instructors, clean booking
// surface for students. The instructor "workshop" lets teachers configure
// services, set availability (which works with their Google Calendar busy
// data), and review bookings. Students see only available services and times.

import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { useUserRole } from '@/hooks/useUserRole';
import { usePreviewRole } from '@/lib/nav/navPreview';

const InstructorWorkshop = lazy(() => import('@/components/officehours/InstructorWorkshop'));
const StudentBooking = lazy(() => import('@/components/officehours/StudentBooking'));

export default function OfficeHoursPage() {
  const { profile } = useProfile();
  const { isSuperAdmin, isAdmin } = useUserRole();
  const preview = usePreviewRole();

  // If the current user is a super-admin previewing as a non-admin
  // role, honor the preview and show the student booking surface.
  // Otherwise fall back to the real-role logic.
  const realIsInstructor = isSuperAdmin() || isAdmin() || profile?.role === 'instructor';
  const isInstructor = preview
    ? preview === 'admin'          // only 'admin' preview keeps the workshop view
    : realIsInstructor;

  return (
    <div className="max-w-5xl mx-auto px-6 py-6 space-y-5">
      <div>
        <h1 className="!text-[1.4rem] sm:!text-[2rem] font-bold tracking-tight leading-tight">
          Office Hours
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          {isInstructor
            ? 'Configure your services, set the times students can book, and review what\'s on the calendar.'
            : 'Pick a service, choose an open time, and we\'ll sync it to your calendar.'}
        </p>
      </div>

      <Suspense fallback={<div className="py-12 text-center"><Loader2 className="w-5 h-5 animate-spin inline text-muted-foreground" /></div>}>
        {isInstructor ? <InstructorWorkshop /> : <StudentBooking />}
      </Suspense>
    </div>
  );
}
