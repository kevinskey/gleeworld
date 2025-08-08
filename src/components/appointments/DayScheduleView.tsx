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
  ChevronDown
} from 'lucide-react';
import { format, addDays, subDays, isSameDay, parseISO, parse } from 'date-fns';
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
  const { toast } = useToast();

  // Generate time slots for the day (8 AM to 7 PM in 15-minute intervals)
  const generateTimeSlots = (): string[] => {
    const slots: string[] = [];
    const startHour = 8;
    const endHour = 19;
    
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
      const dayStart = new Date(selectedDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(selectedDate);
      dayEnd.setHours(23, 59, 59, 999);

      // Fetch auditions for selected day
      const { data: auditions, error: auditionsError } = await supabase
        .from('gw_auditions')
        .select('*')
        .gte('audition_date', dayStart.toISOString())
        .lte('audition_date', dayEnd.toISOString());

      if (auditionsError) throw auditionsError;

      // Fetch appointments for selected day
      const { data: appointments, error: appointmentsError } = await supabase
        .from('gw_appointments')
        .select('*')
        .gte('appointment_date', dayStart.toISOString())
        .lte('appointment_date', dayEnd.toISOString());

      if (appointmentsError) throw appointmentsError;

      // Transform data to DayEvent format
      const auditionEvents: DayEvent[] = (auditions || []).map(audition => {
        const startTime = audition.audition_time || '12:00 PM';
        const duration = 30; // 30 minutes for auditions
        
        // Calculate end time
        const start = parse(startTime, 'h:mm a', new Date());
        const end = new Date(start.getTime() + duration * 60000);
        const endTime = format(end, 'h:mm a');

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
          phone: audition.phone
        };
      });

      const appointmentEvents: DayEvent[] = (appointments || []).map(apt => {
        const aptDate = parseISO(apt.appointment_date);
        const startTime = format(aptDate, 'h:mm a');
        const duration = apt.duration_minutes || 60;
        
        // Calculate end time
        const end = new Date(aptDate.getTime() + duration * 60000);
        const endTime = format(end, 'h:mm a');

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
          phone: apt.client_phone
        };
      });

      const allEvents = [...auditionEvents, ...appointmentEvents];
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
  }, [selectedDate]);

  const navigateDay = (direction: 'prev' | 'next') => {
    setSelectedDate(prev => 
      direction === 'prev' ? subDays(prev, 1) : addDays(prev, 1)
    );
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

        <Button className="bg-red-600 hover:bg-red-700 text-white">
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
            onClick={() => setSelectedDate(new Date())}
          >
            Today
          </Button>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigateDay('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <h2 className="text-lg font-semibold min-w-[200px] text-center">
              {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </h2>
            
            <Button variant="ghost" size="sm" onClick={() => navigateDay('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm">
            Options <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
          
          <div className="flex border rounded-md">
            <Button 
              variant={viewMode === 'month' ? 'default' : 'ghost'} 
              size="sm"
              className="rounded-r-none"
              onClick={() => setViewMode('month')}
            >
              Month
            </Button>
            <Button 
              variant={viewMode === 'week' ? 'default' : 'ghost'} 
              size="sm"
              className="rounded-none"
              onClick={() => setViewMode('week')}
            >
              Week
            </Button>
            <Button 
              variant={viewMode === 'day' ? 'default' : 'ghost'} 
              size="sm"
              className="rounded-l-none"
              onClick={() => setViewMode('day')}
            >
              Day
            </Button>
          </div>
          
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>
      </div>

      {/* Calendar Content */}
      <div className="p-6">
        <div className="bg-white rounded-lg border">
          {/* Time slots */}
          <div className="divide-y">
            {timeSlots.map((timeSlot, index) => {
              const appointment = getAppointmentForTimeSlot(timeSlot);
              const isStartOfAppointment = appointment && (index === 0 || 
                getAppointmentForTimeSlot(timeSlots[index - 1]) !== appointment);
              
              return (
                <div key={timeSlot} className="flex min-h-[60px] hover:bg-gray-50">
                  {/* Time column */}
                  <div className="w-24 p-3 text-sm text-gray-600 font-medium border-r">
                    {timeSlot}
                  </div>
                  
                  {/* Appointment column */}
                  <div className="flex-1 p-3">
                    {appointment && isStartOfAppointment && (
                      <div className={`p-3 rounded ${getStatusColor(appointment.status, appointment.type)}`}>
                        <div className="font-medium text-gray-900 mb-1">
                          {appointment.title.toUpperCase()}
                        </div>
                        <div className="text-sm text-gray-600">
                          {appointment.startTime} - {appointment.endTime}
                        </div>
                        <div className="text-sm text-gray-700 mt-1">
                          {appointment.clientName}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          {dayEvents.length === 0 && (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 font-medium">No appointments scheduled</p>
              <p className="text-sm text-gray-400">This day is completely available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};