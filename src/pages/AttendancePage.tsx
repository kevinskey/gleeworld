import React from 'react';
import { AttendanceDashboard } from '@/components/attendance/AttendanceDashboard';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { PageHeader } from '@/components/shared/PageHeader';

export default function AttendancePage() {
  return (
    <UniversalLayout>
      <div className="animate-fade-in">
        <PageHeader
          title="Attendance Management"
          description="Track attendance, manage excuses, and generate reports for glee club events"
          backgroundVariant="gradient"
        />
        <AttendanceDashboard />
      </div>
    </UniversalLayout>
  );
}