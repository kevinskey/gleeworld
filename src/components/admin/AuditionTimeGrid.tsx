import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, User } from 'lucide-react';
import { useAvailableAuditionSlots } from '@/hooks/useAvailableAuditionSlots';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toZonedTime } from 'date-fns-tz';

interface AuditionAppointment {
  id: string;
  full_name: string;
  email: string;
  audition_time_slot: string;
  status: string;
}

export const AuditionTimeGrid = () => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [appointments, setAppointments] = useState<AuditionAppointment[]>([]);
  const [loading, setLoading] = useState(false);
  
  const { allTimeSlots, loading: slotsLoading, availableDates } = useAvailableAuditionSlots(selectedDate);

  // Set the first available date by default
  useEffect(() => {
    if (availableDates.length > 0 && !selectedDate) {
      setSelectedDate(availableDates[0]);
    }
  }, [availableDates, selectedDate]);

  // Fetch appointments for selected date
  useEffect(() => {
    if (selectedDate) {
      fetchAppointmentsForDate();
    }
  }, [selectedDate]);

  const fetchAppointmentsForDate = async () => {
    if (!selectedDate) return;
    
    setLoading(true);
    try {
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('audition_applications')
        .select('id, full_name, email, audition_time_slot, status')
        .gte('audition_time_slot', startOfDay.toISOString())
        .lte('audition_time_slot', endOfDay.toISOString())
        .order('audition_time_slot');

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAppointmentForSlot = (timeString: string) => {
    return appointments.find(apt => {
      const aptTime = toZonedTime(new Date(apt.audition_time_slot), 'America/New_York');
      const aptTimeString = aptTime.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      });
      return aptTimeString === timeString;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'bg-blue-500/10 text-blue-700 border-blue-200';
      case 'confirmed':
        return 'bg-green-500/10 text-green-700 border-green-200';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-700 border-yellow-200';
      case 'cancelled':
        return 'bg-red-500/10 text-red-700 border-red-200';
      default:
        return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
  };

  if (availableDates.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Audition Dates Available</h3>
        <p className="text-muted-foreground">
          There are currently no audition dates scheduled.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Audition Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-6">
            {availableDates.map((date, index) => (
              <Button
                key={index}
                variant={selectedDate?.toDateString() === date.toDateString() ? "default" : "outline"}
                onClick={() => setSelectedDate(date)}
                className="p-4 h-auto"
              >
                {date.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </Button>
            ))}
          </div>

          {/* Time Grid */}
          {selectedDate && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-4 w-4" />
                <h3 className="font-medium">
                  {selectedDate.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric' 
                  })} - Eastern Time
                </h3>
              </div>

              {slotsLoading || loading ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-spin" />
                  <p className="text-muted-foreground">Loading schedule...</p>
                </div>
              ) : allTimeSlots.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {allTimeSlots.map((slot, index) => {
                    const appointment = getAppointmentForSlot(slot.time);
                    const isBooked = !!appointment;
                    
                    return (
                      <div
                        key={index}
                        className={cn(
                          "p-3 rounded-lg border text-center min-h-[80px] flex flex-col justify-center",
                          isBooked 
                            ? "bg-primary/5 border-primary/20" 
                            : "bg-muted/30 border-muted"
                        )}
                      >
                        <div className="font-medium text-sm mb-1">
                          {slot.time}
                        </div>
                        
                        {isBooked && appointment ? (
                          <div className="space-y-1">
                            <div className="flex items-center justify-center">
                              <User className="h-3 w-3 mr-1" />
                              <span className="text-xs font-medium truncate">
                                {appointment.full_name}
                              </span>
                            </div>
                            <div 
                              className={cn(
                                "text-xs px-2 py-1 rounded border text-center",
                                getStatusColor(appointment.status)
                              )}
                            >
                              {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground">
                            Available
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No time slots available for this date.</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {selectedDate && appointments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Daily Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {appointments.length}
                </div>
                <div className="text-sm text-muted-foreground">
                  Total Bookings
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {appointments.filter(a => a.status === 'confirmed').length}
                </div>
                <div className="text-sm text-muted-foreground">
                  Confirmed
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {appointments.filter(a => a.status === 'submitted').length}
                </div>
                <div className="text-sm text-muted-foreground">
                  Submitted
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-muted-foreground">
                  {allTimeSlots.filter(slot => slot.isAvailable).length}
                </div>
                <div className="text-sm text-muted-foreground">
                  Available
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};