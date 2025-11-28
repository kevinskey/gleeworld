import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarViews } from '@/components/calendar/CalendarViews';

interface CalendarSectionProps {
  courseId: string;
}

export const CalendarSection: React.FC<CalendarSectionProps> = ({ courseId }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Course Calendar</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">GleeWorld Event Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            View all GleeWorld events, performances, rehearsals, and important dates. Use filters to show only course-related events.
          </p>
        </CardContent>
      </Card>

      <div className="border rounded-lg p-4 bg-card">
        <CalendarViews />
      </div>
    </div>
  );
};
