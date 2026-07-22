import React from 'react';
import { FullAttendanceRecord } from '@/components/attendance/FullAttendanceRecord';
import { BackNavigation } from '@/components/shared/BackNavigation';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { UniversalLayout } from '@/components/layout/UniversalLayout';

const FullAttendanceRecordPage = () => {
  return (
    <UniversalLayout>
    <DashboardPageShell
      title="Full Attendance Record"
      subtitle="Complete overview of your attendance history and statistics"
    >
      {/* Back Navigation */}
      <BackNavigation />

      {/* Full Attendance Record Component */}
      <FullAttendanceRecord />
    </DashboardPageShell>
    </UniversalLayout>
  );
};

export default FullAttendanceRecordPage;