import React from 'react';
import { FullAttendanceRecord } from '@/components/attendance/FullAttendanceRecord';
import { BackNavigation } from '@/components/shared/BackNavigation';

const FullAttendanceRecordPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Back Navigation */}
        <BackNavigation />
        
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="rounded-lg p-3 bg-blue-100 text-blue-600">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold">Full Attendance Record</h1>
            <p className="text-muted-foreground">Complete overview of your attendance history and statistics</p>
          </div>
        </div>

        {/* Full Attendance Record Component */}
        <FullAttendanceRecord />
      </div>
    </div>
  );
};

export default FullAttendanceRecordPage;