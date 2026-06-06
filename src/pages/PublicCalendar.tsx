import { PublicCalendarViews } from "@/components/calendar/PublicCalendarViews";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Calendar as CalendarIcon } from "lucide-react";
const PublicCalendar = () => {
  return <PublicLayout>
      <div className="min-h-screen bg-white">
        {/* Header Banner */}
        <div className="w-full py-4 sm:py-5 flex items-center justify-center" style={{
        backgroundColor: '#150d26'
      }}>
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-center gap-3 mb-1">
              <CalendarIcon className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white text-center tracking-wide">
                Events Calendar
              </h1>
            </div>
            <p className="text-white/70 text-center mt-1 text-xs sm:text-sm max-w-xl mx-auto">
              View all public events and performances from Your favorite band or choir
            </p>
          </div>
        </div>

        {/* Calendar Section with Sidebar */}
        <div className="py-8 sm:py-12 md:py-16 bg-white pt-[32px]">
          <div className="w-full px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
              {/* Main Calendar */}
              <div className="lg:col-span-4">
                <PublicCalendarViews />
              </div>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>;
};
export default PublicCalendar;