import React from 'react';
import { AttendanceDashboard } from '@/components/attendance/AttendanceDashboard';
import { UniversalLayout } from '@/components/layout/UniversalLayout';

export default function AttendancePage() {
  return (
    <UniversalLayout>
      <div className="animate-fade-in">
        <AttendanceDashboard />
      </div>
    </UniversalLayout>
  );
}