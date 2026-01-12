import { useState } from "react";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { format, addMonths, subMonths } from "date-fns";
import { CalendarViewSelector } from "./CalendarViewSelector";
import { PublicMonthlyCalendar } from "./PublicMonthlyCalendar";
import { EventsList } from "./EventsList";
import { WeeklyCalendar } from "./WeeklyCalendar";
import { FeaturedEventsSection } from "./FeaturedEventsSection";
import { usePublicGleeWorldEvents } from "@/hooks/usePublicGleeWorldEvents";
import { Button } from "@/components/ui/button";

export const PublicCalendarViews = () => {
  const [activeView, setActiveView] = useState("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const { events, loading, fetchEvents } = usePublicGleeWorldEvents();

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(current => 
      direction === 'prev' ? subMonths(current, 1) : addMonths(current, 1)
    );
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

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
    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-neutral-200">
      {/* Calendar Header with Month Navigation */}
      <div className="bg-white border-b border-neutral-200 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Month Navigation */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigateMonth('prev')}
              className="h-10 w-10 rounded-full border-neutral-300"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            
            <div className="min-w-[200px] text-center">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#003666]">
                {format(currentDate, 'MMMM yyyy')}
              </h2>
            </div>
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigateMonth('next')}
              className="h-10 w-10 rounded-full border-neutral-300"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={goToToday}
              className="ml-2 text-[#003666] hover:bg-[#003666]/10"
            >
              Today
            </Button>
          </div>

          {/* View Selector */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-white hidden sm:inline">
              {events.length} event{events.length !== 1 ? 's' : ''}
            </span>
            <CalendarViewSelector 
              activeView={activeView} 
              onViewChange={setActiveView}
            />
          </div>
        </div>
      </div>

      {/* Featured Events Section */}
      <div className="p-4 sm:p-6 bg-white border-b border-neutral-200">
        <FeaturedEventsSection events={events} />
      </div>

      {/* Calendar Content */}
      <div className="p-4 sm:p-6 bg-neutral-50">
        {activeView === 'month' && (
          <div className="animate-fade-in">
            <PublicMonthlyCalendar 
              events={events} 
              onEventUpdated={fetchEvents}
              currentDate={currentDate}
              onDateChange={setCurrentDate}
            />
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
