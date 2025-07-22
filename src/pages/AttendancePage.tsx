import React from 'react';
import { AttendanceDashboard } from '@/components/attendance/AttendanceDashboard';
import { UniversalLayout } from '@/components/layout/UniversalLayout';

export default function AttendancePage() {
  return (
    <UniversalLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100/50 relative overflow-hidden">
        {/* Liquid glass background elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-3xl"></div>
        
        {/* Content with glass effect */}
        <div className="relative z-10 backdrop-blur-sm">
          <div className="animate-fade-in">
            <AttendanceDashboard />
          </div>
        </div>
      </div>
    </UniversalLayout>
  );
}