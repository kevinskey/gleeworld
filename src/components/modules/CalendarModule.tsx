import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from 'lucide-react';

export const CalendarModule = () => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          <CardTitle>Calendar</CardTitle>
        </div>
        <CardDescription>
          View upcoming events, rehearsals, and important dates
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center text-muted-foreground py-8">
          <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Calendar features coming soon...</p>
        </div>
      </CardContent>
    </Card>
  );
};