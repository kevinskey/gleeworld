import { CalendarViews } from "@/components/calendar/CalendarViews";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { BackNavigation } from "@/components/shared/BackNavigation";
const Calendar = () => {
  return <UniversalLayout showHeader={true} showFooter={false}>
      <div className="min-h-screen w-full">
        <div className="w-full px-[100px] py-[20px] sm:py-8">
          {/* Back Navigation */}
          <BackNavigation className="mb-6" />
          
          {/* Header - Clean Figma Style */}
          <div className="mb-6 sm:mb-8">
            
            
          </div>
          
          {/* Main Content */}
          <CalendarViews />
        </div>
      </div>
    </UniversalLayout>;
};
export default Calendar;