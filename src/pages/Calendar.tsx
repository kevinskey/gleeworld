import { CalendarViews } from "@/components/calendar/CalendarViews";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { BackNavigation } from "@/components/shared/BackNavigation";
const Calendar = () => {
  return <UniversalLayout showHeader={true} showFooter={false}>
      <div className="h-[100dvh] w-full flex flex-col overflow-hidden">
        <div className="w-full flex-1 flex flex-col min-h-0 px-3 sm:px-6 md:px-8 lg:px-12 py-1 sm:py-2">
          {/* Back Navigation - compact on mobile */}
          <BackNavigation className="mb-1 sm:mb-2 flex-shrink-0" />
          
          {/* Main Content - fills remaining space */}
          <div className="flex-1 min-h-0">
            <CalendarViews />
          </div>
        </div>
      </div>
    </UniversalLayout>;
};
export default Calendar;