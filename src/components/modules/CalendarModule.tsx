import React from 'react';
import { ModuleProps } from '@/types/unified-modules';
import { CalendarViews } from "@/components/calendar/CalendarViews";
import { NextEventCard } from "@/components/calendar/NextEventCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin } from 'lucide-react';

export const CalendarModule = ({ user, isFullPage = false }: ModuleProps) => {
  if (isFullPage) {
    // Render the full Calendar page when in full-page mode
    const CalendarPage = React.lazy(() => import('@/pages/Calendar'));
    return (
      <React.Suspense fallback={<div>Loading...</div>}>
        <CalendarPage />
      </React.Suspense>
    );
  }

  // Render a compact dashboard view for inline/module mode
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-xl font-bold">Calendar</h2>
            <p className="text-sm text-muted-foreground">Upcoming events and rehearsals</p>
          </div>
        </div>
        <Badge variant="secondary">
          Today
        </Badge>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Next Event Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Next Event
            </CardTitle>
          </CardHeader>
          <CardContent>
            <NextEventCard />
          </CardContent>
        </Card>
        
        {/* Upcoming Events Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">This Week</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Rehearsal - Tuesday</span>
              </div>
              <span className="text-muted-foreground">7:00 PM</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Performance - Friday</span>
              </div>
              <span className="text-muted-foreground">8:00 PM</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>Sectional - Sunday</span>
              </div>
              <span className="text-muted-foreground">2:00 PM</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mini Calendar View */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Calendar Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-80 overflow-hidden">
            <CalendarViews />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};