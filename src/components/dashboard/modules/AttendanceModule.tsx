import React from 'react';
import { UserCheck } from 'lucide-react';

export const AttendanceModule = () => {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center text-muted-foreground">
        <UserCheck className="w-16 h-16 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Attendance Module</h3>
        <p>Check-in and records will appear here</p>
      </div>
    </div>
  );
};