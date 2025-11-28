import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface CalendarSectionProps {
  courseId: string;
}

export const CalendarSection: React.FC<CalendarSectionProps> = ({ courseId }) => {
  // Mock events - in real implementation, fetch from database
  const events = [
    {
      id: 1,
      title: 'Midterm Exam',
      date: new Date(2025, 2, 15),
      type: 'exam',
      time: '10:00 AM'
    },
    {
      id: 2,
      title: 'Assignment Due: Choral Warm-Up #1',
      date: new Date(2025, 1, 28),
      type: 'assignment',
      time: '11:59 PM'
    },
    {
      id: 3,
      title: 'Office Hours',
      date: new Date(2025, 1, 26),
      type: 'office-hours',
      time: '3:00 PM - 5:00 PM'
    }
  ];

  const getEventColor = (type: string) => {
    switch (type) {
      case 'exam': return 'destructive';
      case 'assignment': return 'default';
      case 'office-hours': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Course Calendar</h2>
      </div>

      <div className="space-y-4">
        {events.map((event) => (
          <Card key={event.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <CalendarIcon className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-lg">{event.title}</CardTitle>
                    <div className="flex items-center gap-4 mt-2">
                      <p className="text-sm text-muted-foreground">
                        {format(event.date, 'EEEE, MMMM d, yyyy')}
                      </p>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {event.time}
                      </div>
                    </div>
                  </div>
                </div>
                <Badge variant={getEventColor(event.type)}>
                  {event.type.split('-').join(' ')}
                </Badge>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
};
