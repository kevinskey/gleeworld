import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon } from "lucide-react";
import { CalendarViewSelector } from "./CalendarViewSelector";
import { PublicMonthlyCalendar } from "./PublicMonthlyCalendar";
import { EventsList } from "./EventsList";
import { WeeklyCalendar } from "./WeeklyCalendar";
import { usePublicGleeWorldEvents } from "@/hooks/usePublicGleeWorldEvents";

export const PublicCalendarViews = () => {
  const [activeView, setActiveView] = useState("month");
  const { events, loading, fetchEvents } = usePublicGleeWorldEvents();

  // Remove debug logging to reduce console noise
  // console.log('PublicCalendarViews render:', { events: events.length, loading });

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Public Events Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse">Loading public events...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show events count for debugging
  if (events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Public Events Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CalendarIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Public Events Found</h3>
            <p className="text-muted-foreground">
              There are currently no upcoming public events to display.
            </p>
            <button 
              onClick={() => fetchEvents()} 
              className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
            >
              Refresh Events
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <CalendarIcon className="h-5 w-5" />
            Public Events Calendar
          </CardTitle>
          <CalendarViewSelector 
            activeView={activeView} 
            onViewChange={setActiveView}
          />
        </div>
      </CardHeader>
      <CardContent className="p-3 md:p-6">
        <div className="mt-4">
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
      </CardContent>
    </Card>
  );
};