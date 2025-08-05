import React from 'react';
import { UserPlus } from 'lucide-react';
import { ModuleWrapper } from '@/components/shared/ModuleWrapper';
import { StudentIntakeProcessor } from '@/components/admin/StudentIntakeProcessor';
import { ModuleProps } from '@/types/modules';

export const StudentIntakeModule = ({ user, isFullPage = false }: ModuleProps) => {
  return (
    <ModuleWrapper
      id="student-intake"
      title="Student Intake"
      description="Process new student registrations and onboarding"
      icon={UserPlus}
      iconColor="orange"
      fullPage={isFullPage}
    >
      <StudentIntakeProcessor />
    </ModuleWrapper>
  );
};