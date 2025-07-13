import React from 'react';
import AttendanceTest from '@/components/attendance/AttendanceTest';

export default function AttendanceTestPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Attendance System Testing</h1>
        <p className="text-muted-foreground mt-2">
          Test the Phase 1 attendance system database schema and functionality.
        </p>
      </div>
      <AttendanceTest />
    </div>
  );
}