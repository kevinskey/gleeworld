import { CalendarViews } from "@/components/calendar/CalendarViews";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { BackNavigation } from "@/components/shared/BackNavigation";
const Calendar = () => {
  return <UniversalLayout showHeader={true} showFooter={false}>
      <div className="min-h-screen w-full">
        <div className="w-full py-2 sm:py-4 px-[50px]">
          {/* Back Navigation */}
          <BackNavigation className="mb-2" />
          
          {/* Main Content */}
          <CalendarViews />
        </div>
      </div>
    </UniversalLayout>;
};
export default Calendar;