import React from 'react';
import { AttendanceDashboard } from '@/components/attendance/AttendanceDashboard';
import { UniversalLayout } from '@/components/layout/UniversalLayout';

export default function AttendancePage() {
  return (
    <UniversalLayout>
      <div className="min-h-screen bg-muted/30">
        <AttendanceDashboard />
      </div>
    </UniversalLayout>
  );
}
