import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar,
  ChevronLeft, 
  ChevronRight,
  Clock,
  Plus,
  User
} from 'lucide-react';
import { format, addDays, subDays, isSameDay, parseISO, parse } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dayEvents, setDayEvents] = useState<DayEvent[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Generate time slots for the day (8 AM to 8 PM in 15-minute intervals)
  const generateTimeSlots = (events: DayEvent[]): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const startHour = 8;
    const endHour = 20;
    
    for (let hour = startHour; hour <= endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const displayTime = format(new Date().setHours(hour, minute), 'h:mm a');
        
        // Find events that overlap with this time slot
        const slotEvents = events.filter(event => {
          const eventStart = parse(event.startTime, 'h:mm a', new Date());
          const eventEnd = parse(event.endTime, 'h:mm a', new Date());
          const slotTime = new Date().setHours(hour, minute);
          
          return slotTime >= eventStart.getTime() && slotTime < eventEnd.getTime();
        });
        
        slots.push({
          time: displayTime,
          hour,
          minute,
          events: slotEvents,
          available: slotEvents.length === 0
        });
      }
    }
    
    return slots;
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
          title: 'Audition',
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
      setTimeSlots(generateTimeSlots(allEvents));

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
    if (type === 'audition') {
      switch (status) {
        case 'confirmed': return 'bg-green-100 text-green-800 border-green-200';
        case 'pending': return 'bg-orange-100 text-orange-800 border-orange-200';
        case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
        default: return 'bg-purple-100 text-purple-800 border-purple-200';
      }
    } else {
      switch (status) {
        case 'confirmed': return 'bg-green-100 text-green-800 border-green-200';
        case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
        default: return 'bg-blue-100 text-blue-800 border-blue-200';
      }
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-8">Loading day schedule...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Date Navigation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Day Schedule
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigateDay('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="text-lg font-medium min-w-[200px] text-center">
                {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </div>
              
              <Button variant="outline" size="sm" onClick={() => navigateDay('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setSelectedDate(new Date())}
              >
                Today
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Day Schedule Grid */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Schedule for {format(selectedDate, 'MMM d')}
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-purple-100 rounded border border-purple-200"></div>
                <span>Auditions</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-100 rounded border border-blue-200"></div>
                <span>Appointments</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-gray-100 rounded border border-gray-200"></div>
                <span>Available</span>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 gap-0 border rounded-lg overflow-hidden">
            {/* Time Grid */}
            {timeSlots.filter((_, index) => index % 4 === 0).map((slot, hourIndex) => {
              const hourSlots = timeSlots.slice(hourIndex * 4, (hourIndex * 4) + 4);
              
              return (
                <div key={slot.time} className="grid grid-cols-5 border-b last:border-b-0">
                  {/* Time Column */}
                  <div className="bg-gray-50 p-3 border-r font-medium text-sm text-gray-600">
                    {slot.time}
                  </div>
                  
                  {/* 15-minute slots for the hour */}
                  {hourSlots.map((quarterSlot, quarterIndex) => (
                    <div 
                      key={`${hourIndex}-${quarterIndex}`}
                      className={`min-h-[60px] p-2 border-r last:border-r-0 ${
                        quarterSlot.available ? 'bg-white hover:bg-gray-50' : ''
                      }`}
                    >
                      {quarterSlot.events.map((event) => (
                        <div
                          key={event.id}
                          className={`p-2 rounded text-xs mb-1 ${getStatusColor(event.status, event.type)}`}
                        >
                          <div className="font-medium flex items-center gap-1">
                            {event.type === 'audition' ? '🎵' : '📅'}
                            {event.title}
                          </div>
                          <div className="text-xs opacity-75">
                            {event.clientName}
                          </div>
                          <div className="text-xs opacity-75">
                            {event.startTime} - {event.endTime}
                          </div>
                        </div>
                      ))}
                      
                      {quarterSlot.available && quarterIndex === 0 && (
                        <div className="text-xs text-gray-400 text-center py-2">
                          Available
                        </div>
                      )}
                    </div>
                  ))}
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
        </CardContent>
      </Card>

      {/* Daily Summary */}
      {dayEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Daily Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {dayEvents.filter(e => e.type === 'audition').length}
                </div>
                <div className="text-sm text-gray-600">Auditions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {dayEvents.filter(e => e.type === 'appointment').length}
                </div>
                <div className="text-sm text-gray-600">Appointments</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {timeSlots.filter(s => s.available).length}
                </div>
                <div className="text-sm text-gray-600">Available Slots</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};