import { ModuleProps } from '@/types/modules';
import { MasterCalendar } from '@/components/admin/MasterCalendar';

export const CalendarManagementModule = ({ user, isFullPage, onNavigate }: ModuleProps) => {
  return (
    <div className="space-y-6">
      {!isFullPage && (
        <div className="border-l-4 border-primary pl-4">
          <h2 className="text-xl font-semibold text-primary">Calendar Management</h2>
          <p className="text-sm text-muted-foreground">
            Master calendar for scheduling and blocking dates/times
          </p>
        </div>
      )}
      
      <MasterCalendar />
    </div>
  );
};