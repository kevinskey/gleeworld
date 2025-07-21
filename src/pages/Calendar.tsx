import { CalendarViews } from "@/components/calendar/CalendarViews";
import { NextEventCard } from "@/components/calendar/NextEventCard";
import { NotificationIndicator } from "@/components/calendar/NotificationIndicator";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { useAuth } from "@/contexts/AuthContext";

const Calendar = () => {
  const { user } = useAuth();
  
  return (
    <UniversalLayout showHeader={true} showFooter={false}>
      <div className="container mx-auto -mt-2.5 pt-0 pb-2 md:pb-3 space-y-3 md:space-y-4 px-4 glass-modal-overlay">
        <CalendarViews />
      </div>
    </UniversalLayout>
  );
};

export default Calendar;