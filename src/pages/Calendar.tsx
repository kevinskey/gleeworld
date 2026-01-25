import { CalendarViews } from "@/components/calendar/CalendarViews";
import { UniversalLayout } from "@/components/layout/UniversalLayout";

const Calendar = () => {
  return (
    <UniversalLayout showHeader={true} showFooter={false}>
      <div className="h-[calc(100dvh-var(--gw-header-h,4rem)-5rem)] sm:h-[calc(100dvh-var(--gw-header-h,4rem))] w-full flex flex-col overflow-hidden">
        <CalendarViews />
      </div>
    </UniversalLayout>
  );
};

export default Calendar;