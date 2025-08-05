import React from 'react';
import { Users } from 'lucide-react';
import { ModuleWrapper } from '@/components/shared/ModuleWrapper';
import { UserManagement } from '@/components/admin/UserManagement';
import { ModuleProps } from '@/types/modules';

export const UserManagementModule = ({ user, isFullPage = false }: ModuleProps) => {
  return (
    <ModuleWrapper
      id="user-management"
      title="User Management"
      description="Manage user accounts, roles, and permissions"
      icon={Users}
      iconColor="blue"
      fullPage={isFullPage}
    >
      <UserManagement />
    </ModuleWrapper>
  );
};