import { CalendarViews } from "@/components/calendar/CalendarViews";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { BackNavigation } from "@/components/shared/BackNavigation";
const Calendar = () => {
  return <UniversalLayout showHeader={true} showFooter={false}>
      <div className="min-h-screen w-full">
        <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-7xl">
          {/* Back Navigation */}
          <BackNavigation className="mb-6" />
          
          {/* Header - Clean Figma Style */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-base sm:text-lg md:text-xl font-bold text-foreground">
              My Calendar
            </h1>
            
          </div>
          
          {/* Main Content */}
          <CalendarViews />
        </div>
      </div>
    </UniversalLayout>;
};
export default Calendar;