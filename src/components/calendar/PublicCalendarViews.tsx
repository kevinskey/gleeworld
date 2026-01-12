import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { CalendarViewSelector } from "./CalendarViewSelector";
import { PublicMonthlyCalendar } from "./PublicMonthlyCalendar";
import { EventsList } from "./EventsList";
import { WeeklyCalendar } from "./WeeklyCalendar";
import { usePublicGleeWorldEvents } from "@/hooks/usePublicGleeWorldEvents";
import { Button } from "@/components/ui/button";

export const PublicCalendarViews = () => {
  const [activeView, setActiveView] = useState("month");
  const { events, loading, fetchEvents } = usePublicGleeWorldEvents();

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8">
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-[#003666] border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground text-sm">Loading events...</p>
          </div>
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 bg-[#003666]/10 rounded-full flex items-center justify-center mb-4">
            <CalendarIcon className="h-8 w-8 text-[#003666]" />
          </div>
          <h3 className="text-xl font-semibold text-[#003666] mb-2">No Public Events Found</h3>
          <p className="text-muted-foreground max-w-md mb-6">
            There are currently no upcoming public events to display. Check back soon for updates!
          </p>
          <Button 
            onClick={() => fetchEvents()} 
            className="bg-[#003666] hover:bg-[#002244] text-white"
          >
            Refresh Events
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* View Selector Header */}
      <div className="flex items-center justify-between gap-4 p-4 sm:p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#003666]/10 rounded-lg flex items-center justify-center">
            <CalendarIcon className="h-5 w-5 text-[#003666]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[#003666]">Upcoming Events</h2>
            <p className="text-sm text-muted-foreground">{events.length} event{events.length !== 1 ? 's' : ''} scheduled</p>
          </div>
        </div>
        <CalendarViewSelector 
          activeView={activeView} 
          onViewChange={setActiveView}
        />
      </div>

      {/* Calendar Content */}
      <div className="p-4 sm:p-6">
        {activeView === 'month' && (
          <div className="animate-fade-in">
            <PublicMonthlyCalendar events={events} onEventUpdated={fetchEvents} />
          </div>
        )}
        
        {activeView === 'week' && (
          <div className="animate-fade-in">
            <WeeklyCalendar events={events} onEventUpdated={fetchEvents} />
          </div>
        )}
        
        {activeView === 'list' && (
          <div className="animate-fade-in">
            <EventsList events={events} onEventUpdated={fetchEvents} />
          </div>
        )}
      </div>
    </div>
  );
};
