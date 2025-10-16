import React from 'react';
import { CalendarViews } from '@/components/calendar/CalendarViews';

export const CalendarModule = () => {
  return (
    <div className="h-full flex flex-col bg-background">
      <CalendarViews />
    </div>
  );
};