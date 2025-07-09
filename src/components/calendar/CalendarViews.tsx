import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarIcon, ListIcon, Grid3X3Icon } from "lucide-react";
import { MonthlyCalendar } from "./MonthlyCalendar";
import { EventsList } from "./EventsList";
import { WeeklyCalendar } from "./WeeklyCalendar";
import { CreateEventDialog } from "./CreateEventDialog";
import { useGleeWorldEvents } from "@/hooks/useGleeWorldEvents";

export const CalendarViews = () => {
  const [activeView, setActiveView] = useState("month");
  const { events, loading, fetchEvents } = useGleeWorldEvents();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse">Loading events...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Glee World Calendar
          </CardTitle>
          <CreateEventDialog onEventCreated={fetchEvents} />
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeView} onValueChange={setActiveView}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="month" className="flex items-center gap-2">
              <Grid3X3Icon className="h-4 w-4" />
              Month
            </TabsTrigger>
            <TabsTrigger value="week" className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Week
            </TabsTrigger>
            <TabsTrigger value="list" className="flex items-center gap-2">
              <ListIcon className="h-4 w-4" />
              List
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="month" className="mt-6">
            <MonthlyCalendar events={events} />
          </TabsContent>
          
          <TabsContent value="week" className="mt-6">
            <WeeklyCalendar events={events} />
          </TabsContent>
          
          <TabsContent value="list" className="mt-6">
            <EventsList events={events} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};