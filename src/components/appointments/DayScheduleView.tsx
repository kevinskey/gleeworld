import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Calendar,
  ChevronLeft, 
  ChevronRight,
  Clock,
  Plus,
  User,
  Filter,
  ChevronDown,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { format, addDays, subDays, isSameDay, parseISO, parse, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface DayEvent {
  id: string;
  title: string;
  clientName: string;
  startTime: string;
  endTime: string;
  status: string;
  type: 'audition' | 'appointment';
  duration: number;
  email?: string;
  phone?: string;
  date?: string; // Add date field for filtering
}

interface TimeSlot {
  time: string;
  hour: number;
  minute: number;
  events: DayEvent[];
  available: boolean;
}

export const DayScheduleView = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dayEvents, setDayEvents] = useState<DayEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('day');
  const [showAuditions, setShowAuditions] = useState(true);
  const [showAppointments, setShowAppointments] = useState(true);
  const [showPendingAppointments, setShowPendingAppointments] = useState(true);
  const [showGoogleCalendarEvents, setShowGoogleCalendarEvents] = useState(false);
  const [appointmentTitleDisplay, setAppointmentTitleDisplay] = useState<'service' | 'employee' | 'customer'>('service');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>('12h');
  const { toast } = useToast();

  // Generate time slots for the day (6 AM to 10 PM in 15-minute intervals)
  const generateTimeSlots = (): string[] => {
    const slots: string[] = [];
    const startHour = 6;
    const endHour = 22;
    
    for (let hour = startHour; hour <= endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const time = new Date();
        time.setHours(hour, minute, 0, 0);
        slots.push(format(time, 'h:mm a'));
      }
    }
    
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Check if an appointment overlaps with a time slot
  const getAppointmentForTimeSlot = (timeSlot: string): DayEvent | null => {
    return dayEvents.find(event => {
      const slotTime = parse(timeSlot, 'h:mm a', new Date());
      const eventStart = parse(event.startTime, 'h:mm a', new Date());
      const eventEnd = parse(event.endTime, 'h:mm a', new Date());
      
      return slotTime >= eventStart && slotTime < eventEnd;
    }) || null;
  };

  const fetchDaySchedule = async () => {
    setLoading(true);
    try {
      let startDate, endDate;
      
      // Determine date range based on view mode
      if (viewMode === 'month') {
        const monthStart = startOfMonth(selectedDate);
        const monthEnd = endOfMonth(selectedDate);
        startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
        endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
      } else if (viewMode === 'week') {
        startDate = startOfWeek(selectedDate, { weekStartsOn: 0 });
        endDate = endOfWeek(selectedDate, { weekStartsOn: 0 });
      } else {
        // Day view
        startDate = new Date(selectedDate);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(selectedDate);
        endDate.setHours(23, 59, 59, 999);
      }

      console.log('Fetching for view mode:', viewMode);
      console.log('Date range:', format(startDate, 'yyyy-MM-dd'), 'to', format(endDate, 'yyyy-MM-dd'));

      // First check if there are any auditions at all to help with debugging
      const { data: allAuditions } = await supabase
        .from('gw_auditions')
        .select('audition_date, first_name, last_name')
        .order('audition_date', { ascending: true })
        .limit(5);
      
      console.log('Sample auditions in database:', allAuditions);

      // Fetch auditions for the date range
      const { data: auditions, error: auditionsError } = await supabase
        .from('gw_auditions')
        .select('*')
        .gte('audition_date', `${format(startDate, 'yyyy-MM-dd')}T00:00:00.000Z`)
        .lt('audition_date', `${format(addDays(endDate, 1), 'yyyy-MM-dd')}T00:00:00.000Z`);

      console.log('Auditions found for range:', auditions);

      if (auditionsError) throw auditionsError;

      // Fetch appointments for the date range
      const { data: appointments, error: appointmentsError } = await supabase
        .from('gw_appointments')
        .select('*')
        .gte('appointment_date', `${format(startDate, 'yyyy-MM-dd')}T00:00:00.000Z`)
        .lt('appointment_date', `${format(addDays(endDate, 1), 'yyyy-MM-dd')}T00:00:00.000Z`);

      console.log('Appointments found for range:', appointments);

      if (appointmentsError) throw appointmentsError;

      // Transform data to DayEvent format
      const auditionEvents: DayEvent[] = (auditions || []).map(audition => {
        const startTime = audition.audition_time || '12:00 PM';
        const duration = 30; // 30 minutes for auditions
        
        // Calculate end time
        const start = parse(startTime, 'h:mm a', new Date());
        const end = new Date(start.getTime() + duration * 60000);
        const endTime = format(end, 'h:mm a');

        console.log('Processing audition:', audition.first_name, audition.last_name, 'at', startTime, 'on', audition.audition_date);

        return {
          id: audition.id,
          title: 'Glee Club Audition',
          clientName: `${audition.first_name} ${audition.last_name}`,
          startTime,
          endTime,
          status: audition.status || 'scheduled',
          type: 'audition' as const,
          duration,
          email: audition.email,
          phone: audition.phone,
          date: audition.audition_date // Add the actual date for filtering
        };
      });

      const appointmentEvents: DayEvent[] = (appointments || []).map(apt => {
        const aptDate = parseISO(apt.appointment_date);
        const startTime = format(aptDate, 'h:mm a');
        const duration = apt.duration_minutes || 60;
        
        // Calculate end time
        const end = new Date(aptDate.getTime() + duration * 60000);
        const endTime = format(end, 'h:mm a');

        console.log('Processing appointment:', apt.client_name, 'at', startTime, 'on', apt.appointment_date);

        return {
          id: apt.id,
          title: apt.title || 'Appointment',
          clientName: apt.client_name,
          startTime,
          endTime,
          status: apt.status,
          type: 'appointment' as const,
          duration,
          email: apt.client_email,
          phone: apt.client_phone,
          date: apt.appointment_date // Add the actual date for filtering
        };
      });

      const allEvents = [...auditionEvents, ...appointmentEvents];
      console.log('Total events found:', allEvents.length, allEvents);
      setDayEvents(allEvents);

    } catch (error) {
      console.error('Error fetching day schedule:', error);
      toast({
        title: "Error",
        description: "Failed to load day schedule",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDaySchedule();
  }, [selectedDate, viewMode]);

  const navigateDay = (direction: 'prev' | 'next', event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    setSelectedDate(prev => {
      if (viewMode === 'week') {
        // Navigate by weeks when in week view
        return direction === 'prev' ? subDays(prev, 7) : addDays(prev, 7);
      } else if (viewMode === 'month') {
        // Navigate by months when in month view
        return direction === 'prev' 
          ? new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
          : new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
      } else {
        // Navigate by days when in day view
        return direction === 'prev' ? subDays(prev, 1) : addDays(prev, 1);
      }
    });
  };

  const getStatusColor = (status: string, type: 'audition' | 'appointment') => {
    // Return background colors for appointment blocks
    if (type === 'audition') {
      switch (status) {
        case 'confirmed': return 'bg-purple-50 border-l-4 border-purple-500';
        case 'pending': return 'bg-orange-50 border-l-4 border-orange-500';
        case 'cancelled': return 'bg-red-50 border-l-4 border-red-500';
        default: return 'bg-purple-50 border-l-4 border-purple-400';
      }
    } else {
      switch (status) {
        case 'confirmed': return 'bg-blue-50 border-l-4 border-blue-500';
        case 'pending': return 'bg-yellow-50 border-l-4 border-yellow-500';
        case 'cancelled': return 'bg-red-50 border-l-4 border-red-500';
        default: return 'bg-blue-50 border-l-4 border-blue-400';
      }
    }
  };

  // Filter events based on current filters
  const filteredEvents = dayEvents.filter(event => {
    if (!showAuditions && event.type === 'audition') return false;
    if (!showAppointments && event.type === 'appointment') return false;
    if (!showPendingAppointments && event.status === 'pending') return false;
    if (statusFilter !== 'all' && event.status !== statusFilter) return false;
    return true;
  });

  // Get display title based on selected option
  const getDisplayTitle = (event: DayEvent) => {
    switch (appointmentTitleDisplay) {
      case 'employee':
        return 'Provider'; // Could be dynamic based on provider data
      case 'customer':
        return event.clientName;
      case 'service':
      default:
        return event.title;
    }
  };

  // Handle new appointment creation
  const handleNewAppointment = () => {
    toast({
      title: "New Appointment",
      description: "Redirecting to appointment scheduler...",
    });
    // In a real app, this would navigate to the appointment creation form
  };

  // Render different views based on viewMode
  const renderCalendarContent = () => {
    switch (viewMode) {
      case 'month':
        return renderMonthView();
      case 'week':
        return renderWeekView();
      case 'day':
      default:
        return renderDayView();
    }
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    
    // Get the first day of the calendar (including days from previous month)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday = 0
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    return (
      <div className="bg-white rounded-lg border">
        <div className="grid grid-cols-7 gap-px bg-gray-200">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="bg-gray-50 p-2 text-center text-sm font-medium text-gray-900">
              {day}
            </div>
          ))}
          {days.map(day => {
            const isCurrentMonth = day.getMonth() === selectedDate.getMonth();
            const isToday = isSameDay(day, new Date());
            const dayEvents = filteredEvents.filter(event => {
              // Check if event is on this specific day
              if (!event.date) return false;
              return isSameDay(day, parseISO(event.date));
            });
            
            return (
              <div 
                key={day.toISOString()} 
                className={`bg-white p-2 min-h-[140px] hover:bg-gray-50 ${
                  !isCurrentMonth ? 'text-gray-400 bg-gray-100' : ''
                } ${isToday ? 'bg-blue-50 ring-1 ring-blue-200' : ''}`}
              >
                <div className={`font-medium text-sm mb-1 ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map(event => (
                    <div key={event.id} className="text-xs p-1 rounded bg-blue-100 text-blue-800 truncate">
                      {event.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 }); // Sunday = 0
    const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 0 });
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

    return (
      <div className="bg-white rounded-lg border">
        <div className="grid grid-cols-8 gap-px bg-gray-200">
          <div className="bg-gray-50 p-2"></div>
          {days.map(day => {
            const isToday = isSameDay(day, new Date());
            return (
              <div key={day.toISOString()} className={`bg-gray-50 p-2 text-center ${isToday ? 'bg-blue-50 text-blue-600' : ''}`}>
                <div className="font-medium text-sm">{format(day, 'EEE')}</div>
                <div className={`text-lg font-bold ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                  {format(day, 'd')}
                </div>
              </div>
            );
          })}
          {timeSlots.map(timeSlot => (
            <React.Fragment key={timeSlot}>
              <div className="bg-white p-2 text-xs text-gray-600 font-medium border-r min-h-[30px]">
                {timeFormat === '24h' ? format(parse(timeSlot, 'h:mm a', new Date()), 'HH:mm') : timeSlot}
              </div>
              {days.map(day => {
                const dayEvents = filteredEvents.filter(event => {
                  // Check if the event is on this specific day
                  if (!event.date) return false;
                  return isSameDay(day, parseISO(event.date));
                });
                const appointment = dayEvents.find(event => {
                  const slotTime = parse(timeSlot, 'h:mm a', new Date());
                  const eventStart = parse(event.startTime, 'h:mm a', new Date());
                  const eventEnd = parse(event.endTime, 'h:mm a', new Date());
                  return slotTime >= eventStart && slotTime < eventEnd;
                });
                
                return (
                  <div key={`${day.toISOString()}-${timeSlot}`} className="bg-white p-1 min-h-[30px] hover:bg-gray-50 border-b border-gray-100">
                    {appointment && (
                      <div className={`p-1 rounded text-xs truncate ${getStatusColor(appointment.status, appointment.type)}`}>
                        <div className="font-medium">{appointment.title}</div>
                        <div className="text-xs opacity-75">{appointment.clientName}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    return (
      <div className="bg-white rounded-lg border max-h-[70vh] overflow-y-auto">
        <div className="divide-y divide-gray-100">
          {timeSlots.map((timeSlot, index) => {
            const appointment = getAppointmentForTimeSlot(timeSlot);
            const isStartOfAppointment = appointment && (index === 0 || 
              getAppointmentForTimeSlot(timeSlots[index - 1]) !== appointment);
            
            // Check if this appointment should be filtered out
            if (appointment && !filteredEvents.includes(appointment)) {
              return null;
            }
            
            return (
              <div key={timeSlot} className="flex min-h-[40px] hover:bg-gray-50">
                <div className="w-20 p-2 text-xs text-gray-600 font-medium border-r bg-gray-50/50">
                  {timeFormat === '24h' ? format(parse(timeSlot, 'h:mm a', new Date()), 'HH:mm') : timeSlot}
                </div>
                <div className="flex-1 p-2">
                  {appointment && isStartOfAppointment && (
                    <div className={`p-2 rounded-md ${getStatusColor(appointment.status, appointment.type)}`}>
                      <div className="font-medium text-gray-900 mb-1 text-sm">
                        {getDisplayTitle(appointment).toUpperCase()}
                      </div>
                      <div className="text-xs text-gray-600">
                        {timeFormat === '24h' 
                          ? `${format(parse(appointment.startTime, 'h:mm a', new Date()), 'HH:mm')} - ${format(parse(appointment.endTime, 'h:mm a', new Date()), 'HH:mm')}`
                          : `${appointment.startTime} - ${appointment.endTime}`
                        }
                      </div>
                      <div className="text-xs text-gray-700 mt-1">
                        {appointment.clientName}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        {filteredEvents.length === 0 && (
          <div className="text-center py-8">
            <Clock className="h-8 w-8 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500 font-medium text-sm">No appointments scheduled</p>
            <p className="text-xs text-gray-400">This day is completely available</p>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white min-h-screen">
        <div className="text-center py-8">Loading calendar...</div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between p-6 bg-white border-b">
        <div className="flex items-center gap-4">
          {/* User Profile */}
          <div className="flex items-center gap-3 bg-orange-100 p-3 rounded-lg">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-orange-200 text-orange-800">
                {user?.email?.[0]?.toUpperCase() || 'A'}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium text-sm text-gray-900">
                {user?.email?.split('@')[0] || 'Provider'}
              </div>
              <div className="text-xs text-gray-600">Glee Club</div>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
        </div>

        <Button 
          className="bg-red-600 hover:bg-red-700 text-white"
          onClick={handleNewAppointment}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Appointment
        </Button>
      </div>

      {/* Navigation Bar */}
      <div className="flex items-center justify-between p-6 bg-gray-50 border-b">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              setSelectedDate(new Date());
            }}
          >
            Today
          </Button>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={(e) => navigateDay('prev', e)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <h2 className="text-lg font-semibold min-w-[200px] text-center">
              {viewMode === 'week' 
                ? `${format(startOfWeek(selectedDate, { weekStartsOn: 0 }), 'MMM d')} - ${format(endOfWeek(selectedDate, { weekStartsOn: 0 }), 'MMM d, yyyy')}`
                : viewMode === 'month'
                ? format(selectedDate, 'MMMM yyyy')
                : format(selectedDate, 'EEEE, MMMM d, yyyy')
              }
            </h2>
            
            <Button variant="ghost" size="sm" onClick={(e) => navigateDay('next', e)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Options <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 bg-white border shadow-lg z-50">
              <DropdownMenuLabel className="text-gray-600 text-sm">Choose what to show</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              <DropdownMenuCheckboxItem
                checked={showPendingAppointments}
                onCheckedChange={setShowPendingAppointments}
                className="text-gray-700"
              >
                Show Pending Appointments
              </DropdownMenuCheckboxItem>
              
              <DropdownMenuCheckboxItem
                checked={showGoogleCalendarEvents}
                onCheckedChange={setShowGoogleCalendarEvents}
                className="text-red-600"
              >
                Show Google Calendar Events
              </DropdownMenuCheckboxItem>
              
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-gray-600 text-sm">Show appointment titles as</DropdownMenuLabel>
              
              <DropdownMenuItem 
                onClick={() => setAppointmentTitleDisplay('service')}
                className={appointmentTitleDisplay === 'service' ? 'bg-red-50 text-red-600' : 'text-gray-700'}
              >
                <div className="flex items-center justify-between w-full">
                  Service name
                  {appointmentTitleDisplay === 'service' && <ChevronDown className="h-4 w-4" />}
                </div>
              </DropdownMenuItem>
              
              <DropdownMenuItem 
                onClick={() => setAppointmentTitleDisplay('employee')}
                className={appointmentTitleDisplay === 'employee' ? 'bg-red-50 text-red-600' : 'text-gray-700'}
              >
                Employee name
              </DropdownMenuItem>
              
              <DropdownMenuItem 
                onClick={() => setAppointmentTitleDisplay('customer')}
                className={appointmentTitleDisplay === 'customer' ? 'bg-red-50 text-red-600' : 'text-gray-700'}
              >
                Customer Name
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setTimeFormat(timeFormat === '12h' ? '24h' : '12h')}>
                <Clock className="mr-2 h-4 w-4" />
                {timeFormat === '12h' ? 'Switch to 24h' : 'Switch to 12h'}
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => setSelectedDate(new Date())}>
                <Calendar className="mr-2 h-4 w-4" />
                Go to Today
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <div className="flex border rounded-md">
            <Button 
              variant={viewMode === 'month' ? 'default' : 'ghost'} 
              size="sm"
              className="rounded-r-none"
              onClick={(e) => {
                e.preventDefault();
                setViewMode('month');
              }}
            >
              Month
            </Button>
            <Button 
              variant={viewMode === 'week' ? 'default' : 'ghost'} 
              size="sm"
              className="rounded-none"
              onClick={(e) => {
                e.preventDefault();
                setViewMode('week');
              }}
            >
              Week
            </Button>
            <Button 
              variant={viewMode === 'day' ? 'default' : 'ghost'} 
              size="sm"
              className="rounded-l-none"
              onClick={(e) => {
                e.preventDefault();
                setViewMode('day');
              }}
            >
              Day
            </Button>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Filter Events</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={showAuditions}
                onCheckedChange={setShowAuditions}
              >
                Show Auditions
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={showAppointments}
                onCheckedChange={setShowAppointments}
              >
                Show Appointments
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Status Filter</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setStatusFilter('all')}>
                <div className="flex items-center">
                  {statusFilter === 'all' && <div className="w-2 h-2 bg-blue-500 rounded-full mr-2" />}
                  All Statuses
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('confirmed')}>
                <div className="flex items-center">
                  {statusFilter === 'confirmed' && <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />}
                  Confirmed Only
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('pending')}>
                <div className="flex items-center">
                  {statusFilter === 'pending' && <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2" />}
                  Pending Only
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Calendar Content */}
      <div className="p-6">
        {renderCalendarContent()}
      </div>
    </div>
  );
};