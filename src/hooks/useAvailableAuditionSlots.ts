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

        // Generate time slots based on audition time block
        const blockStart = new Date(auditionBlock.start_date);
        const blockEnd = new Date(auditionBlock.end_date);
        const appointmentDuration = auditionBlock.appointment_duration_minutes || 30;

        const slots: TimeSlot[] = [];
        const currentTime = new Date(blockStart);
        
        // Set to same date as selected date but use block start time
        currentTime.setFullYear(selectedDate.getFullYear());
        currentTime.setMonth(selectedDate.getMonth());
        currentTime.setDate(selectedDate.getDate());

        while (currentTime < blockEnd) {
          const timeString = format(currentTime, 'h:mm a');
          
          // Check if this slot is already taken
          const isAvailable = !existingAppointments?.some(apt => {
            const aptDate = new Date(apt.audition_date);
            return format(aptDate, 'h:mm a') === timeString;
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