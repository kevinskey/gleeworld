import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, BookOpen, FileCheck, Users, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';

interface CalendarSectionProps {
  courseId: string;
}

interface CourseEvent {
  id: string;
  date: Date;
  title: string;
  type: 'class' | 'assignment' | 'test' | 'office-hours' | 'deadline' | 'exam';
  time?: string;
  description?: string;
}

// Mock data - will be replaced with actual course events from database
const mockCourseEvents: CourseEvent[] = [
  { id: '1', date: new Date(2025, 10, 5), title: 'Baton Technique Workshop', type: 'class', time: '2:00 PM' },
  { id: '2', date: new Date(2025, 10, 10), title: 'Score Analysis Assignment Due', type: 'assignment', time: '11:59 PM' },
  { id: '3', date: new Date(2025, 10, 12), title: 'Midterm Exam', type: 'exam', time: '2:00 PM' },
  { id: '4', date: new Date(2025, 10, 15), title: 'Office Hours with Dr. Johnson', type: 'office-hours', time: '3:00 PM' },
  { id: '5', date: new Date(2025, 10, 20), title: 'Conducting Project Presentation', type: 'test', time: '2:00 PM' },
  { id: '6', date: new Date(2025, 10, 25), title: 'Research Paper Draft Due', type: 'deadline', time: '11:59 PM' },
];

export const CalendarSection: React.FC<CalendarSectionProps> = ({ courseId }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getEventsForDate = (date: Date) => {
    return mockCourseEvents.filter(event => isSameDay(event.date, date));
  };

  const getEventColor = (type: CourseEvent['type']) => {
    switch (type) {
      case 'class': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'assignment': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'test': return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
      case 'exam': return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'office-hours': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      case 'deadline': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getEventIcon = (type: CourseEvent['type']) => {
    switch (type) {
      case 'class': return <BookOpen className="h-3 w-3" />;
      case 'assignment': return <FileCheck className="h-3 w-3" />;
      case 'test':
      case 'exam': return <FileCheck className="h-3 w-3" />;
      case 'office-hours': return <Users className="h-3 w-3" />;
      case 'deadline': return <Clock className="h-3 w-3" />;
      default: return <CalendarIcon className="h-3 w-3" />;
    }
  };

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Academic Calendar</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Course Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            View all course events, assignment deadlines, tests, office hours, and important academic dates for {courseId.toUpperCase()}.
          </p>
          
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={getEventColor('class')}>
              <BookOpen className="h-3 w-3 mr-1" />
              Class Sessions
            </Badge>
            <Badge variant="outline" className={getEventColor('assignment')}>
              <FileCheck className="h-3 w-3 mr-1" />
              Assignments
            </Badge>
            <Badge variant="outline" className={getEventColor('test')}>
              <FileCheck className="h-3 w-3 mr-1" />
              Tests/Quizzes
            </Badge>
            <Badge variant="outline" className={getEventColor('exam')}>
              <FileCheck className="h-3 w-3 mr-1" />
              Exams
            </Badge>
            <Badge variant="outline" className={getEventColor('office-hours')}>
              <Users className="h-3 w-3 mr-1" />
              Office Hours
            </Badge>
            <Badge variant="outline" className={getEventColor('deadline')}>
              <Clock className="h-3 w-3 mr-1" />
              Deadlines
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar View */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{format(currentDate, 'MMMM yyyy')}</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(new Date())}
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, idx) => {
                const dayEvents = getEventsForDate(day);
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isToday = isSameDay(day, new Date());
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDate(day)}
                    className={`
                      aspect-square p-1 text-sm rounded-lg border transition-colors
                      ${isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'}
                      ${isToday ? 'border-primary bg-primary/5 font-bold' : 'border-border'}
                      ${isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}
                      ${dayEvents.length > 0 ? 'font-semibold' : ''}
                    `}
                  >
                    <div className="flex flex-col items-center justify-center h-full">
                      <span>{format(day, 'd')}</span>
                      {dayEvents.length > 0 && (
                        <div className="flex gap-0.5 mt-0.5">
                          {dayEvents.slice(0, 3).map((event, i) => (
                            <div
                              key={i}
                              className={`w-1 h-1 rounded-full ${
                                event.type === 'exam' ? 'bg-red-500' :
                                event.type === 'test' ? 'bg-orange-500' :
                                event.type === 'assignment' ? 'bg-green-500' :
                                event.type === 'class' ? 'bg-blue-500' :
                                event.type === 'office-hours' ? 'bg-purple-500' :
                                'bg-yellow-500'
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Selected Date Events */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {selectedDate ? format(selectedDate, 'MMM d, yyyy') : 'Select a date'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDateEvents.length > 0 ? (
              <div className="space-y-3">
                {selectedDateEvents.map(event => (
                  <div
                    key={event.id}
                    className={`border rounded-lg p-3 ${getEventColor(event.type)}`}
                  >
                    <div className="flex items-start gap-2">
                      {getEventIcon(event.type)}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm">{event.title}</h4>
                        {event.time && (
                          <p className="text-xs opacity-80 mt-0.5">
                            <Clock className="h-3 w-3 inline mr-1" />
                            {event.time}
                          </p>
                        )}
                        {event.description && (
                          <p className="text-xs opacity-80 mt-1">{event.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : selectedDate ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No events scheduled for this date
              </p>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Select a date to view events
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Events List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Upcoming Academic Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {mockCourseEvents
              .filter(event => event.date >= new Date())
              .sort((a, b) => a.date.getTime() - b.date.getTime())
              .slice(0, 5)
              .map(event => (
                <div
                  key={event.id}
                  className={`flex items-center justify-between p-3 border rounded-lg ${getEventColor(event.type)}`}
                >
                  <div className="flex items-center gap-3">
                    {getEventIcon(event.type)}
                    <div>
                      <h4 className="font-semibold text-sm">{event.title}</h4>
                      <p className="text-xs opacity-80">
                        {format(event.date, 'MMM d, yyyy')}
                        {event.time && ` • ${event.time}`}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {event.type.replace('-', ' ')}
                  </Badge>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
