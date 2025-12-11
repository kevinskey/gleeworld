import React from 'react';
import { Shield } from 'lucide-react';
import { ModuleWrapper } from '@/components/shared/ModuleWrapper';
import { UnifiedUserManagement } from '@/components/admin/UnifiedUserManagement';
import { ModuleProps } from '@/types/unified-modules';

export const PermissionsModule = ({ user, isFullPage = false }: ModuleProps) => {
  return (
    <ModuleWrapper
      id="user-permissions-management"
      title="User & Permission Management"
      description="Unified management for users, roles, and permissions"
      icon={Shield}
      iconColor="red"
      fullPage={isFullPage}
      collapsible={false}
      defaultOpen={true}
    >
      <UnifiedUserManagement />
    </ModuleWrapper>
  );
};