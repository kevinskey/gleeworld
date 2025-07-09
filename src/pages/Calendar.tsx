import { CalendarViews } from "@/components/calendar/CalendarViews";
import { UpcomingEvents } from "@/components/calendar/UpcomingEvents";

const Calendar = () => {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Glee World Calendar</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Stay up to date with all Glee Club events, rehearsals, and performances. 
          View our calendar in different formats and never miss an important event.
        </p>
      </div>
      
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <CalendarViews />
        </div>
        
        <div>
          <UpcomingEvents limit={8} />
        </div>
      </div>
    </div>
  );
};

export default Calendar;