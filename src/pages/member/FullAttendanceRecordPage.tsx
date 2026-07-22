import React from 'react';
import { FullAttendanceRecord } from '@/components/attendance/FullAttendanceRecord';
import { BackNavigation } from '@/components/shared/BackNavigation';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { DashboardShell } from '@/components/dashboard/DashboardShell';

const FullAttendanceRecordPage = () => {
  return (
    <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell>
    <DashboardPageShell
      title="Full Attendance Record"
      subtitle="Complete overview of your attendance history and statistics"
    >
      {/* Back Navigation */}
      <BackNavigation />

      {/* Full Attendance Record Component */}
      <FullAttendanceRecord />
    </DashboardPageShell>
    </DashboardShell>
    </UniversalLayout>
  );
};

export default FullAttendanceRecordPage;