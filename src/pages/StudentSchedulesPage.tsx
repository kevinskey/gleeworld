import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { SecretaryScheduleView } from '@/components/academy/SecretaryScheduleView';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { DashboardShell } from '@/components/dashboard/DashboardShell';

const StudentSchedulesPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell>
      <DashboardPageShell
      title="Student Class Schedules"
      subtitle="View all submitted student schedules and identify rehearsal conflicts"
    >
      <Button variant="ghost" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      {/* Secretary View Component */}
      <SecretaryScheduleView semester="Spring 2026" />
    </DashboardPageShell>
    </DashboardShell>
    </UniversalLayout>
  );
};

export default StudentSchedulesPage;
