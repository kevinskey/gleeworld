import { CalendarViews } from "@/components/calendar/CalendarViews";
import { UpcomingEvents } from "@/components/calendar/UpcomingEvents";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { useAuth } from "@/contexts/AuthContext";

const Calendar = () => {
  const { user } = useAuth();
  
  return (
    <UniversalLayout showHeader={true} showFooter={false}>
      <div className="container mx-auto py-4 md:py-8 space-y-4 md:space-y-8 px-4">
        <div className="text-center">
          <h1 className="text-2xl md:text-4xl font-bold mb-4 md:mb-6 text-white">Glee World Calendar</h1>
          {!user && (
            <p className="text-sm md:text-base text-gray-300 mb-4">
              Public events are shown below. Sign in to see all events and create your own.
            </p>
          )}
          {user && (
            <p className="text-sm md:text-base text-gray-300 mb-4">
              Welcome back! You're seeing all events including private ones.
            </p>
          )}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
          <div className="lg:col-span-2 order-2 lg:order-1">
            <CalendarViews />
          </div>
          
          <div className="order-1 lg:order-2">
            <UpcomingEvents limit={8} />
          </div>
        </div>
      </div>
    </UniversalLayout>
  );
};

export default Calendar;