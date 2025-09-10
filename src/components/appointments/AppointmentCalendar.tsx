import React, { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock, User, Phone, Mail } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isSameMonth, isToday } from 'date-fns';

interface Appointment {
  id: string;
  title: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  service: string;
  date: Date;
  time: string;
  duration: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  calendarId?: string;
}

interface AppointmentCalendarProps {
  appointments?: Appointment[];
  onDateSelect?: (date: Date) => void;
  onAppointmentSelect?: (appointment: Appointment) => void;
}

export const AppointmentCalendar: React.FC<AppointmentCalendarProps> = ({
  appointments = [],
  onDateSelect,
  onAppointmentSelect
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getAppointmentsForDate = (date: Date) => {
    return appointments.filter(apt => isSameDay(new Date(apt.date), date));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'completed': return 'bg-blue-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    onDateSelect?.(date);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6">
      {/* Calendar */}
      <div className="xl:col-span-2">
        <Card>
          <CardHeader className="pb-3 lg:pb-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-2 text-lg lg:text-xl">
                <Calendar className="h-4 w-4 lg:h-5 lg:w-5" />
                <span className="truncate">{format(currentDate, 'MMMM yyyy')}</span>
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                  <ChevronLeft className="h-4 w-4" />
                  <span className="sr-only">Previous month</span>
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                  <ChevronRight className="h-4 w-4" />
                  <span className="sr-only">Next month</span>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3 lg:p-6">
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 lg:gap-2 mb-3 lg:mb-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="p-1 lg:p-2 text-center text-xs lg:text-sm font-medium text-muted-foreground">
                  <span className="hidden sm:inline">{day}</span>
                  <span className="sm:hidden">{day.slice(0, 1)}</span>
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-1 lg:gap-2">
              {monthDays.map(date => {
                const dayAppointments = getAppointmentsForDate(date);
                const isSelected = selectedDate && isSameDay(date, selectedDate);
                const isCurrentMonth = isSameMonth(date, currentDate);
                const isCurrentDay = isToday(date);
                
                return (
                  <div
                    key={date.toISOString()}
                    className={`
                      p-1 lg:p-2 min-h-[60px] sm:min-h-[80px] border rounded-lg cursor-pointer transition-colors
                      ${isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}
                      ${isCurrentDay ? 'ring-1 lg:ring-2 ring-primary' : ''}
                      ${!isCurrentMonth ? 'opacity-50' : ''}
                    `}
                    onClick={() => handleDateClick(date)}
                  >
                    <div className="text-xs lg:text-sm font-medium mb-1">
                      {format(date, 'd')}
                    </div>
                    <div className="space-y-1">
                      {dayAppointments.slice(0, window.innerWidth < 640 ? 2 : 3).map(apt => (
                        <div
                          key={apt.id}
                          className={`
                            text-xs p-1 rounded truncate cursor-pointer
                            ${getStatusColor(apt.status)} text-white
                          `}
                          onClick={(e) => {
                            e.stopPropagation();
                            onAppointmentSelect?.(apt);
                          }}
                          title={`${apt.time} - ${apt.clientName}`}
                        >
                          <span className="hidden sm:inline">{apt.time} - {apt.clientName}</span>
                          <span className="sm:hidden">{apt.time}</span>
                        </div>
                      ))}
                      {dayAppointments.length > (window.innerWidth < 640 ? 2 : 3) && (
                        <div className="text-xs text-muted-foreground">
                          +{dayAppointments.length - (window.innerWidth < 640 ? 2 : 3)} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Selected Date Details */}
      <div>
        <Card>
          <CardHeader className="pb-3 lg:pb-6">
            <CardTitle className="text-lg lg:text-xl">
              {selectedDate ? (
                <span className="break-words">{format(selectedDate, 'EEEE, MMMM do')}</span>
              ) : (
                'Select a date'
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 lg:p-6">
            {selectedDate ? (
              <div className="space-y-3 lg:space-y-4">
                {getAppointmentsForDate(selectedDate).length === 0 ? (
                  <p className="text-muted-foreground text-center py-6 lg:py-8 text-sm lg:text-base">
                    No appointments on this date
                  </p>
                ) : (
                  <div className="space-y-3">
                    {getAppointmentsForDate(selectedDate).map(apt => (
                      <div
                        key={apt.id}
                        className="border rounded-lg p-3 cursor-pointer hover:bg-muted transition-colors"
                        onClick={() => onAppointmentSelect?.(apt)}
                      >
                        <div className="flex items-center justify-between mb-2 gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Clock className="h-4 w-4 flex-shrink-0" />
                            <span className="font-medium text-sm lg:text-base">{apt.time}</span>
                          </div>
                          <Badge className={getStatusColor(apt.status) + ' text-white border-0 text-xs'}>
                            {apt.status}
                          </Badge>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm min-w-0">
                            <User className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{apt.clientName}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
                            <Mail className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{apt.clientEmail}</span>
                          </div>
                          {apt.clientPhone && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
                              <Phone className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{apt.clientPhone}</span>
                            </div>
                          )}
                          <div className="text-sm font-medium text-primary break-words">
                            {apt.service}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-6 lg:py-8 text-sm lg:text-base">
                Click on a date to view appointments
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};