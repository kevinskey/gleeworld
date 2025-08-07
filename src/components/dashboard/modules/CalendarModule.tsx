import React from 'react';
import { Calendar } from 'lucide-react';

export const CalendarModule = () => {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center text-muted-foreground">
        <Calendar className="w-16 h-16 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Calendar Module</h3>
        <p>Events and scheduling will appear here</p>
      </div>
    </div>
  );
};