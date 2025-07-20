import { CalendarViews } from "@/components/calendar/CalendarViews";
import { NextEventCard } from "@/components/calendar/NextEventCard";
import { NotificationIndicator } from "@/components/calendar/NotificationIndicator";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { useAuth } from "@/contexts/AuthContext";

const Calendar = () => {
  const { user } = useAuth();
  
  return (
    <UniversalLayout showHeader={true} showFooter={false}>
      <div className="container mx-auto py-2 md:py-3 space-y-3 md:space-y-4 px-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Glee World Calendar</h1>
          </div>
          <NotificationIndicator />
        </div>
        
        <NextEventCard />
        
        <CalendarViews />
      </div>
    </UniversalLayout>
  );
};

export default Calendar;