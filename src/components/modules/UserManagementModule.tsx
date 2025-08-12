
import React from 'react';
import { Users, Shield } from 'lucide-react';
import { ModuleWrapper } from '@/components/shared/ModuleWrapper';
import { EnhancedUserManagement } from '@/components/admin/user-management/EnhancedUserManagement';
import { useUsers } from '@/hooks/useUsers';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useUsernamePermissions } from '@/hooks/useUsernamePermissions';
import { ModuleProps } from '@/types/unified-modules';

export const UserManagementModule = ({ user, isFullPage = false }: ModuleProps) => {
  const { users, loading, error, refetch } = useUsers();
  const { user: authUser } = useAuth();
  const { isSuperAdmin, isAdmin, isExecutiveBoard } = useUserRole();
  const { permissions: usernamePermissions, loading: permissionsLoading } = useUsernamePermissions(authUser?.email);

  // Check if user has access to user management
  const hasUserManagementAccess = isSuperAdmin() || isAdmin() || isExecutiveBoard() || usernamePermissions.includes('user-management');

  // Show loading state while checking permissions
  if (permissionsLoading) {
    return (
      <ModuleWrapper
        id="user-management"
        title="User Management"
        description="Manage user accounts, roles, and permissions"
        icon={Users}
        iconColor="blue"
        fullPage={isFullPage}
      >
        <div className="flex items-center justify-center p-8">
          <div className="text-muted-foreground">Loading permissions...</div>
        </div>
      </ModuleWrapper>
    );
  }

  // Show access denied if user doesn't have permissions
  if (!hasUserManagementAccess) {
    return (
      <ModuleWrapper
        id="user-management"
        title="User Management"
        description="Manage user accounts, roles, and permissions"
        icon={Users}
        iconColor="blue"
        fullPage={isFullPage}
      >
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
            <p className="text-muted-foreground">
              You don't have permission to access user management.
            </p>
          </div>
        </div>
      </ModuleWrapper>
    );
  }

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
