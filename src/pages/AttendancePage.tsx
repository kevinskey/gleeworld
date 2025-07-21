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
          backgroundVariant="gradient"
        />
        <AttendanceDashboard />
      </div>
    </UniversalLayout>
  );
}