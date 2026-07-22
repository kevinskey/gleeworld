import { AcademyStudentRegistration } from '@/components/auth/AcademyStudentRegistration';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { DashboardShell } from '@/components/dashboard/DashboardShell';

export default function AcademyStudentRegistrationPage() {
  return (
    <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell>
      <AcademyStudentRegistration />
    </DashboardShell>
    </UniversalLayout>
  );
}
