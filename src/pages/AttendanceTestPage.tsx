import React from 'react';
import { PageHeader } from "@/components/shared/PageHeader";
import AttendanceTest from '@/components/attendance/AttendanceTest';

export default function AttendanceTestPage() {
  return (
    <div className="container mx-auto py-8">
      <PageHeader
        title="Attendance System Testing"
        description="Test the Phase 1 attendance system database schema and functionality"
        backgroundVariant="white"
      />
      <AttendanceTest />
    </div>
  );
}