import React from 'react';
import { AttendanceDashboard } from '@/components/attendance/AttendanceDashboard';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { DashboardShell } from '@/components/dashboard/DashboardShell';

export default function AttendancePage() {
  return (
    <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell>
      <div className="min-h-screen bg-muted/30">
        <AttendanceDashboard />
      </div>
    </DashboardShell>
    </UniversalLayout>
  );
}
