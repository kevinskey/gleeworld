import React from 'react';
import { Shield } from 'lucide-react';
import { ModuleWrapper } from '@/components/shared/ModuleWrapper';
import { UnifiedUserManagement } from '@/components/admin/UnifiedUserManagement';
import { ModuleProps } from '@/types/unified-modules';

export const PermissionsModule = ({ user, isFullPage = false }: ModuleProps) => {
  return (
    <div style={{ 
      color: '#0f172a', 
      background: 'hsl(40 10% 96%)',
      borderRadius: '0.5rem',
      padding: '1rem'
    }}>
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
    </div>
  );
};