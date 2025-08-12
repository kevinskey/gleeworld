import { ModuleProps } from '@/types/unified-modules';
import { MasterCalendar } from '@/components/admin/MasterCalendar';
import { ModuleWrapper } from '@/components/shared/ModuleWrapper';
import { Calendar as CalendarIcon, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useUsernamePermissions } from '@/hooks/useUsernamePermissions';

export const CalendarManagementModule = ({ user, isFullPage, onNavigate }: ModuleProps) => {
  const { user: authUser } = useAuth();
  const { isSuperAdmin, isAdmin } = useUserRole();
  const { permissions: usernamePermissions, loading: permissionsLoading } = useUsernamePermissions(authUser?.email);

  // Check if user has access to calendar management
  const hasCalendarAccess = isSuperAdmin() || isAdmin() || usernamePermissions.includes('calendar-management');

  // Show loading state while checking permissions
  if (permissionsLoading) {
    return (
      <ModuleWrapper
        id="calendar-management"
        title="Calendar Management"
        description="Master calendar for scheduling and blocking dates/times"
        icon={CalendarIcon}
        iconColor="primary"
        fullPage={!!isFullPage}
      >
        <div className="flex items-center justify-center p-8">
          <div className="text-muted-foreground">Loading permissions...</div>
        </div>
      </ModuleWrapper>
    );
  }

  // Show access denied if user doesn't have permissions
  if (!hasCalendarAccess) {
    return (
      <ModuleWrapper
        id="calendar-management"
        title="Calendar Management"
        description="Master calendar for scheduling and blocking dates/times"
        icon={CalendarIcon}
        iconColor="primary"
        fullPage={!!isFullPage}
      >
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
            <p className="text-muted-foreground">
              You don't have permission to access calendar management.
            </p>
          </div>
        </div>
      </ModuleWrapper>
    );
  }

  return (
    <ModuleWrapper
      id="calendar-management"
      title="Calendar Management"
      description="Master calendar for scheduling and blocking dates/times"
      icon={CalendarIcon}
      iconColor="primary"
      fullPage={!!isFullPage}
    >
      <MasterCalendar />
    </ModuleWrapper>
  );
};
