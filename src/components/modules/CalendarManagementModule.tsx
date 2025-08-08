import { ModuleProps } from '@/types/unified-modules';
import { MasterCalendar } from '@/components/admin/MasterCalendar';
import { ModuleWrapper } from '@/components/shared/ModuleWrapper';
import { Calendar as CalendarIcon } from 'lucide-react';

export const CalendarManagementModule = ({ user, isFullPage, onNavigate }: ModuleProps) => {
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
