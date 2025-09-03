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
          </div>
        </div>
      </div>

      {/* Main Calendar View */}
      <Card>
        <CardContent className="p-0">
          <CalendarViews />
        </CardContent>
      </Card>
    </div>
  );
};