import { CalendarViews } from "@/components/calendar/CalendarViews";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { GoogleCalendarSync } from "@/components/calendar/GoogleCalendarSync";
import { Calendar as CalendarIcon } from "lucide-react";
import { BackNavigation } from "@/components/shared/BackNavigation";

const Calendar = () => {
  return (
    <UniversalLayout showHeader={true} showFooter={false}>
      <div className="min-h-screen w-full">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-7xl">
          {/* Back Navigation */}
          <BackNavigation className="mb-4" />
          
          {/* Header */}
          <div className="flex items-center gap-3 mb-4 sm:mb-6">
            <div className="rounded-xl p-2.5 sm:p-3 bg-primary/10">
              <CalendarIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Calendar</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">View and manage events</p>
            </div>
          </div>
          
          {/* Main Content */}
          <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
            <div className="flex-1">
              <CalendarViews />
            </div>
            <div className="lg:w-72 xl:w-80">
              <GoogleCalendarSync />
            </div>
          </div>
        </div>
      </div>
    </UniversalLayout>
  );
};

export default Calendar;
