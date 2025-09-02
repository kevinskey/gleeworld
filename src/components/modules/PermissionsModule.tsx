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
      <div className="p-4 bg-blue-50 rounded-lg mb-4">
        <h3 className="font-semibold text-blue-900">Simplified Access System</h3>
        <p className="text-blue-700 text-sm">All users are now members. Only executive board positions get special access.</p>
      </div>
      <PermissionManagement />
    </ModuleWrapper>
  );
};