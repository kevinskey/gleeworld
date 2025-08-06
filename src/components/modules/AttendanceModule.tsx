import React from 'react';
import { ClipboardCheck } from 'lucide-react';
import { ModuleWrapper } from '@/components/shared/ModuleWrapper';
import { AttendanceDashboard } from '@/components/attendance/AttendanceDashboard';
import { ModuleProps } from '@/types/unified-modules';

export const AttendanceModule = ({ user, isFullPage = false }: ModuleProps) => {
  return (
    <ModuleWrapper
      id="attendance-management"
      title="Attendance Management"
      description="Comprehensive attendance tracking, QR codes, excuse management, and reporting"
      icon={ClipboardCheck}
      iconColor="green"
      fullPage={isFullPage}
    >
      <AttendanceDashboard />
    </ModuleWrapper>
  );
};