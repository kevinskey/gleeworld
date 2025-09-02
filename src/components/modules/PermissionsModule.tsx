import React from 'react';
import { Shield } from 'lucide-react';
import { ModuleWrapper } from '@/components/shared/ModuleWrapper';
import { PermissionManagement } from '@/components/admin/PermissionManagement';
import { ModuleProps } from '@/types/unified-modules';

export const PermissionsModule = ({ user, isFullPage = false }: ModuleProps) => {
  return (
    <ModuleWrapper
      id="permissions-management"
      title="Executive Board Access"
      description="Manage executive board positions and access (everyone else is a member)"
      icon={Shield}
      iconColor="red"
      fullPage={isFullPage}
    >
      <PermissionManagement />
    </ModuleWrapper>
  );
};