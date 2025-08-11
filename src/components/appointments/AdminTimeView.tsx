import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, User, Phone, Mail, Calendar as CalendarIcon } from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Appointment {
  id: string;
  title: string;
  appointment_date: string;
  duration_minutes: number;
  status: string;
  appointment_type: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  notes: string | null;
}

type ViewType = 'day' | 'week';

export const AdminTimeView = () => {
  const [viewType, setViewType] = useState<ViewType>('day');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const startDate = viewType === 'day' 
        ? selectedDate 
        : startOfWeek(selectedDate);
      
      const endDate = viewType === 'day' 
        ? selectedDate 
        : addDays(startDate, 6);

      const { data, error } = await supabase
        .from('gw_appointments')
        .select('*')
        .gte('appointment_date', format(startDate, 'yyyy-MM-dd'))
        .lte('appointment_date', format(endDate, 'yyyy-MM-dd'))
        .order('appointment_date', { ascending: true });

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast({
        title: "Error",
        description: "Failed to load appointments",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateAppointmentStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('gw_appointments')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      setAppointments(prev => 
        prev.map(apt => apt.id === id ? { ...apt, status } : apt)
      );

      toast({
        title: "Success",
        description: `Appointment ${status}`,
      });
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast({
        title: "Error",
        description: "Failed to update appointment",
        variant: "destructive"
      });
    }
  };

  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        slots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
      }
    }
    return slots;
  };

  const getAppointmentsForTimeSlot = (date: Date, time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const slotTime = new Date(date);
    slotTime.setHours(hours, minutes, 0, 0);

    return appointments.filter(apt => {
      const aptDate = new Date(apt.appointment_date);
      return Math.abs(aptDate.getTime() - slotTime.getTime()) < 30 * 60 * 1000; // Within 30 minutes
    });
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const days = viewType === 'day' ? 1 : 7;
    setSelectedDate(prev => 
      direction === 'next' 
        ? addDays(prev, days) 
        : addDays(prev, -days)
    );
  };

  useEffect(() => {
    fetchAppointments();
  }, [selectedDate, viewType]);

  const timeSlots = generateTimeSlots();
  const daysToShow = viewType === 'day' 
    ? [selectedDate] 
    : Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(selectedDate), i));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select value={viewType} onValueChange={(value: ViewType) => setViewType(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Day View</SelectItem>
              <SelectItem value="week">Week View</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigateDate('prev')}>
              ←
            </Button>
            <span className="font-medium">
              {viewType === 'day' 
                ? format(selectedDate, 'MMMM d, yyyy')
                : `${format(startOfWeek(selectedDate), 'MMM d')} - ${format(addDays(startOfWeek(selectedDate), 6), 'MMM d, yyyy')}`
              }
            </span>
            <Button variant="outline" onClick={() => navigateDate('next')}>
              →
            </Button>
          </div>
        </div>

        <Button onClick={() => setSelectedDate(new Date())}>
          Today
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Schedule View
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading schedule...</div>
          ) : (
            <div className="grid gap-4" style={{ 
              gridTemplateColumns: viewType === 'day' ? '80px 1fr' : `80px repeat(7, 1fr)` 
            }}>
              {/* Time column header */}
              <div className="font-medium text-sm text-muted-foreground">Time</div>
              
              {/* Day headers */}
              {daysToShow.map((day, index) => (
                <div key={index} className="font-medium text-sm text-center p-2 border-b">
                  {viewType === 'week' ? (
                    <div>
                      <div>{format(day, 'EEE')}</div>
                      <div className="text-xs text-muted-foreground">{format(day, 'MMM d')}</div>
                    </div>
                  ) : (
                    format(day, 'EEEE, MMMM d')
                  )}
                </div>
              ))}

              {/* Time slots */}
              {timeSlots.map(time => (
                <React.Fragment key={time}>
                  <div className="text-sm text-muted-foreground py-2 border-t">
                    {time}
                  </div>
                  {daysToShow.map((day, dayIndex) => {
                    const dayAppointments = getAppointmentsForTimeSlot(day, time);
                    return (
                      <div key={`${time}-${dayIndex}`} className="min-h-[60px] border-t border-l p-1">
                        {dayAppointments.map(appointment => (
                          <div 
                            key={appointment.id}
                            className="bg-primary/10 border border-primary/20 rounded p-2 mb-1 text-xs"
                          >
                            <div className="font-medium truncate">{appointment.client_name}</div>
                            <div className="text-muted-foreground truncate">{appointment.title}</div>
                            <div className="flex items-center gap-1 mt-1">
                              <Badge 
                                size="sm" 
                                className={
                                  appointment.status === 'confirmed' ? 'bg-status-confirmed text-status-confirmed-fg' :
                                  appointment.status === 'pending_approval' ? 'bg-yellow-100 text-yellow-800' :
                                  appointment.status === 'cancelled' ? 'bg-status-cancelled text-status-cancelled-fg' :
                                  'bg-status-scheduled text-status-scheduled-fg'
                                }
                              >
                                {appointment.status}
                              </Badge>
                            </div>
                            {appointment.status === 'pending_approval' && (
                              <div className="flex gap-1 mt-1">
                                <Button 
                                  size="sm" 
                                  className="h-6 px-2 text-xs"
                                  onClick={() => updateAppointmentStatus(appointment.id, 'confirmed')}
                                >
                                  Approve
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="h-6 px-2 text-xs"
                                  onClick={() => updateAppointmentStatus(appointment.id, 'cancelled')}
                                >
                                  Deny
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Fix React import
import React from 'react';