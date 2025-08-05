import React from 'react';
import { Shield } from 'lucide-react';
import { ModuleWrapper } from '@/components/shared/ModuleWrapper';
import { PermissionManagement } from '@/components/admin/PermissionManagement';
import { ModuleProps } from '@/types/modules';

export const PermissionsModule = ({ user, isFullPage = false }: ModuleProps) => {
  return (
    <ModuleWrapper
      id="permissions-management"
      title="Permissions Management"
      description="Configure user roles, permissions, and access controls"
      icon={Shield}
      iconColor="red"
      fullPage={isFullPage}
    >
      <PermissionManagement />
    </ModuleWrapper>
  );
};