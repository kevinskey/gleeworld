
import React from 'react';
import { Users } from 'lucide-react';
import { ModuleWrapper } from '@/components/shared/ModuleWrapper';
import { EnhancedUserManagement } from '@/components/admin/user-management/EnhancedUserManagement';
import { useUsers } from '@/hooks/useUsers';
import { ModuleProps } from '@/types/unified-modules';

export const UserManagementModule = ({ user, isFullPage = false }: ModuleProps) => {
  const { users, loading, error, refetch } = useUsers();

  return (
    <ModuleWrapper
      id="user-management"
      title="User Management"
      description="Manage user accounts, roles, and permissions"
      icon={Users}
      iconColor="blue"
      fullPage={isFullPage}
    >
      <EnhancedUserManagement 
        users={users}
        loading={loading}
        error={error}
        onRefetch={refetch}
      />
    </ModuleWrapper>
  );
};
