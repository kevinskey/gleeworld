import React from 'react';
import { TimesheetDashboard } from '@/components/timesheet/TimesheetDashboard';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { DashboardShell } from '@/components/dashboard/DashboardShell';

export default function TimesheetPage() {
  return (
    <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell>
      <div className="min-h-screen bg-gradient-to-br from-blue-50/30 via-background to-purple-50/30">
        <TimesheetDashboard />
      </div>
    </DashboardShell>
    </UniversalLayout>
  );
}