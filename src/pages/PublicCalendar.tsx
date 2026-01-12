import { PublicCalendarViews } from "@/components/calendar/PublicCalendarViews";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { Calendar as CalendarIcon } from "lucide-react";

const PublicCalendar = () => {
  return (
    <UniversalLayout showHeader={true} showFooter={true} containerized={false}>
      <div className="min-h-screen bg-white">
        {/* Header Banner */}
        <div 
          className="w-full py-4 sm:py-5 flex items-center justify-center" 
          style={{ backgroundColor: '#003666' }}
        >
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-center gap-3 mb-1">
              <CalendarIcon className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white text-center tracking-wide">
                Events Calendar
              </h1>
            </div>
            <p className="text-white/70 text-center mt-1 text-xs sm:text-sm max-w-xl mx-auto">
              View all public events and performances from Spelman College Glee Club
            </p>
          </div>
        </div>

        {/* Calendar Section */}
        <div className="py-8 sm:py-12 md:py-16 bg-white">
          <div className="w-full px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16">
            <PublicCalendarViews />
          </div>
        </div>
      </div>
    </UniversalLayout>
  );
};

export default PublicCalendar;
