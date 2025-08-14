import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User } from 'lucide-react';
import { useAvailableAuditionSlots } from '@/hooks/useAvailableAuditionSlots';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toZonedTime } from 'date-fns-tz';
import { format } from 'date-fns';

interface AuditionAppointment {
  id: string;
  full_name: string;
  email: string;
  audition_time_slot: string;
  status: string;
}

interface BookedSlot {
  audition_time_slot: string;
  auditioner_name: string;
}

export const AuditionTimeGrid = () => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [appointments, setAppointments] = useState<AuditionAppointment[]>([]);
  const [allAppointments, setAllAppointments] = useState<AuditionAppointment[]>([]);
  const [bookedSlots, setBookedSlots] = useState<BookedSlot[]>([]);
  const [loading, setLoading] = useState(false);
  
  const { allTimeSlots, loading: slotsLoading, availableDates } = useAvailableAuditionSlots(selectedDate);

  // Set the first available date by default
  useEffect(() => {
    if (availableDates.length > 0 && !selectedDate) {
      setSelectedDate(availableDates[0]);
    }
  }, [availableDates, selectedDate]);

  // Fetch appointments for selected date and all available dates
  useEffect(() => {
    if (selectedDate) {
      fetchAppointmentsForDate();
    }
    // Also fetch all appointments in the time window
    fetchAllAppointments();
  }, [selectedDate, availableDates]);

  // Real-time updates for audition applications
  useEffect(() => {
    const channel = supabase
      .channel('audition-schedule-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'audition_applications'
        },
        () => {
          // Refetch appointments when any change occurs
          if (selectedDate) {
            fetchAppointmentsForDate();
          }
          fetchAllAppointments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDate, availableDates]);

  const fetchAllAppointments = async () => {
    if (availableDates.length === 0) return;
    
    try {
      const startDate = new Date(Math.min(...availableDates.map(d => d.getTime())));
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(Math.max(...availableDates.map(d => d.getTime())));
      endDate.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('audition_applications')
        .select('id, full_name, email, audition_time_slot, status')
        .gte('audition_time_slot', startDate.toISOString())
        .lte('audition_time_slot', endDate.toISOString())
        .order('audition_time_slot');

      if (error) throw error;
      
      setAllAppointments(data || []);
      console.log('📅 All appointments in time window:', data?.length || 0);
    } catch (error) {
      console.error('Error fetching all appointments:', error);
    }
  };

  const fetchAppointmentsForDate = async () => {
    if (!selectedDate) return;
    
    setLoading(true);
    try {
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      console.log(`📅 Fetching appointments for ${selectedDate.toDateString()}`);
      console.log(`🕐 Date range: ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`);

      // Get booked slots using the RPC function
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_booked_audition_slots', {
          p_start: startOfDay.toISOString(),
          p_end: endOfDay.toISOString(),
        });

      if (rpcError) {
        console.error('Error fetching booked slots via RPC:', rpcError);
      } else {
        console.log(`🎯 RPC returned ${rpcData?.length || 0} booked slots:`, rpcData);
        setBookedSlots(rpcData || []);
      }

      // Also get full appointment details for display
      const { data, error } = await supabase
        .from('audition_applications')
        .select('id, full_name, email, audition_time_slot, status')
        .gte('audition_time_slot', startOfDay.toISOString())
        .lte('audition_time_slot', endOfDay.toISOString())
        .order('audition_time_slot');

      if (error) throw error;
      console.log(`📋 Found ${data?.length || 0} appointments:`, data);
      setAppointments(data || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAppointmentForSlot = (timeString: string) => {
    // Normalize the time string for comparison (remove extra spaces, standardize format)
    const normalizeTimeString = (time: string) => {
      return time.replace(/\s+/g, ' ').trim().toLowerCase();
    };
    
    const normalizedTargetTime = normalizeTimeString(timeString);
    
    // First try to find in the booked slots from RPC
    const bookedSlot = bookedSlots.find(slot => {
      const slotTime = toZonedTime(new Date(slot.audition_time_slot), 'America/New_York');
      const slotTimeString = format(slotTime, 'h:mm a');
      const normalizedSlotTime = normalizeTimeString(slotTimeString);
      
      console.log(`🔍 Comparing "${normalizedTargetTime}" with "${normalizedSlotTime}" for ${slot.auditioner_name}`);
      
      return normalizedSlotTime === normalizedTargetTime;
    });

    if (bookedSlot) {
      console.log(`✅ Found booked slot for ${timeString}:`, bookedSlot.auditioner_name);
      return {
        id: `booked-${timeString}`,
        full_name: bookedSlot.auditioner_name,
        email: '',
        audition_time_slot: bookedSlot.audition_time_slot,
        status: 'scheduled'
      };
    }

    // Fallback to regular appointments
    const foundAppointment = appointments.find(apt => {
      const aptTime = toZonedTime(new Date(apt.audition_time_slot), 'America/New_York');
      const aptTimeString = format(aptTime, 'h:mm a');
      const normalizedAptTime = normalizeTimeString(aptTimeString);
      
      console.log(`🔍 Comparing "${normalizedTargetTime}" with "${normalizedAptTime}" for ${apt.full_name}`);
      
      return normalizedAptTime === normalizedTargetTime;
    });
    
    if (foundAppointment) {
      console.log(`✅ Found appointment for ${timeString}:`, foundAppointment.full_name);
    }
    
    return foundAppointment;
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
      {/* All Auditions Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            All Scheduled Auditions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableDates.map((date, index) => {
              const dayAppointments = allAppointments.filter(apt => {
                const aptDate = new Date(apt.audition_time_slot);
                return aptDate.toDateString() === date.toDateString();
              });
              
              return (
                <Card key={index} className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  selectedDate?.toDateString() === date.toDateString() 
                    ? "ring-2 ring-primary bg-primary/5" 
                    : "hover:bg-muted/30"
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Button
                        variant="ghost"
                        onClick={() => setSelectedDate(date)}
                        className="p-0 h-auto font-medium text-left"
                      >
                        {date.toLocaleDateString('en-US', { 
                          weekday: 'short', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </Button>
                      <Badge variant="secondary">
                        {dayAppointments.length} auditions
                      </Badge>
                    </div>
                    {dayAppointments.length > 0 && (
                      <div className="space-y-1">
                        {dayAppointments.slice(0, 3).map((apt) => (
                          <div key={apt.id} className="text-xs flex items-center gap-1">
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              apt.status === 'confirmed' ? "bg-green-500" :
                              apt.status === 'submitted' ? "bg-blue-500" : "bg-gray-400"
                            )} />
                            <span className="truncate">{apt.full_name}</span>
                          </div>
                        ))}
                        {dayAppointments.length > 3 && (
                          <div className="text-xs text-muted-foreground">
                            +{dayAppointments.length - 3} more
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Schedule for Selected Date */}
      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {selectedDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric' 
              })} - Eastern Time
            </CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      )}

      {/* Summary Stats for All Appointments */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {allAppointments.length}
              </div>
              <div className="text-sm text-muted-foreground">
                Total Auditions
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {allAppointments.filter(a => a.status === 'confirmed').length}
              </div>
              <div className="text-sm text-muted-foreground">
                Confirmed
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {allAppointments.filter(a => a.status === 'submitted').length}
              </div>
              <div className="text-sm text-muted-foreground">
                Submitted
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-muted-foreground">
                {availableDates.reduce((total, date) => {
                  const daySlots = allTimeSlots.filter(slot => slot.isAvailable);
                  return total + daySlots.length;
                }, 0) - allAppointments.length}
              </div>
              <div className="text-sm text-muted-foreground">
                Available Slots
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};