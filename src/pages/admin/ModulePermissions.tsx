
import React from 'react';
import { ModulePermissionMatrix } from '@/components/admin/ModulePermissionMatrix';

const ModulePermissions = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Module Permissions</h1>
      <ModulePermissionMatrix />
    </div>
  );
};

export default ModulePermissions;
