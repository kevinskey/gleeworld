import { CalendarViews } from "@/components/calendar/CalendarViews";
import { NextEventCard } from "@/components/calendar/NextEventCard";
import { NotificationIndicator } from "@/components/calendar/NotificationIndicator";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { useAuth } from "@/contexts/AuthContext";
import { GoogleCalendarSync } from "@/components/calendar/GoogleCalendarSync";
import { CalendarSidebar } from "@/components/calendar/CalendarSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

const Calendar = () => {
  const { user } = useAuth();
  
  return (
    <UniversalLayout showHeader={true} showFooter={false}>
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <CalendarSidebar />
          <div className="flex-1 flex flex-col">
            <header className="h-12 flex items-center border-b px-4">
              <SidebarTrigger />
              <h1 className="ml-4 text-lg font-semibold">Calendar</h1>
            </header>
            <main className="flex-1 p-4">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <CalendarViews />
                </div>
                <div className="lg:w-80">
                  <GoogleCalendarSync />
                </div>
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </UniversalLayout>
  );
};

export default Calendar;