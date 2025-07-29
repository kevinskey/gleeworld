import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay, format } from 'date-fns';

interface TimeSlot {
  time: string;
  isAvailable: boolean;
}

export const useAvailableAuditionSlots = (selectedDate: Date | null) => {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [availableDates, setAvailableDates] = useState<Date[]>([]);

  // Fetch available audition dates
  useEffect(() => {
    const fetchAuditionDates = async () => {
      try {
        const { data: timeBlocks, error } = await supabase
          .from('audition_time_blocks')
          .select('start_date, end_date')
          .eq('is_active', true);

        if (error) throw error;

        const dates: Date[] = [];
        timeBlocks?.forEach(block => {
          const start = new Date(block.start_date);
          const end = new Date(block.end_date);
          
          // Add all dates between start and end
          const currentDate = new Date(start);
          while (currentDate <= end) {
            dates.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
          }
        });

        setAvailableDates(dates);
      } catch (error) {
        console.error('Error fetching audition dates:', error);
      }
    };

    fetchAuditionDates();
  }, []);

  // Fetch available time slots for selected date
  useEffect(() => {
    if (!selectedDate) {
      setTimeSlots([]);
      return;
    }

    const fetchAvailableSlots = async () => {
      setLoading(true);
      try {
        // Check if this date falls within audition time blocks
        const { data: auditionBlocks, error: blockError } = await supabase
          .from('audition_time_blocks')
          .select('*')
          .eq('is_active', true)
          .lte('start_date', selectedDate.toISOString())
          .gte('end_date', selectedDate.toISOString());

        if (blockError) throw blockError;

        if (!auditionBlocks?.length) {
          setTimeSlots([]);
          return;
        }

        const auditionBlock = auditionBlocks[0];
        
        // Get existing audition appointments for this date
        const { data: existingAppointments, error: appointmentError } = await supabase
          .from('gw_auditions')
          .select('audition_date, audition_time')
          .gte('audition_date', startOfDay(selectedDate).toISOString())
          .lte('audition_date', endOfDay(selectedDate).toISOString());

        if (appointmentError) throw appointmentError;

        // Generate time slots from 9 AM to 5 PM with the specified duration
        const appointmentDuration = auditionBlock.appointment_duration_minutes || 30;
        const slots: TimeSlot[] = [];
        
        // Start at 9 AM
        const startTime = new Date(selectedDate);
        startTime.setHours(9, 0, 0, 0);
        
        // End at 5 PM
        const endTime = new Date(selectedDate);
        endTime.setHours(17, 0, 0, 0);
        
        const currentTime = new Date(startTime);
        
        while (currentTime < endTime) {
          const timeString = format(currentTime, 'h:mm a');
          
          // Check if this slot is already taken
          const isAvailable = !existingAppointments?.some(apt => {
            return apt.audition_time === timeString;
          });

          slots.push({
            time: timeString,
            isAvailable
          });

          currentTime.setMinutes(currentTime.getMinutes() + appointmentDuration);
        }

        setTimeSlots(slots);
      } catch (error) {
        console.error('Error fetching available slots:', error);
        setTimeSlots([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAvailableSlots();
  }, [selectedDate]);

  return {
    timeSlots: timeSlots.filter(slot => slot.isAvailable).map(slot => slot.time),
    allTimeSlots: timeSlots,
    loading,
    availableDates
  };
};