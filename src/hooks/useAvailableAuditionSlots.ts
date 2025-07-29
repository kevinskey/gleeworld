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
          // Each time block represents a specific time on a specific date
          // Extract just the date portion from start_date
          const blockDate = new Date(block.start_date);
          
          // Only add the date if it's not already in the array
          const dateExists = dates.some(date => 
            date.toDateString() === blockDate.toDateString()
          );
          
          if (!dateExists) {
            dates.push(new Date(blockDate.getFullYear(), blockDate.getMonth(), blockDate.getDate()));
          }
        });

        console.log('Available audition dates:', dates);
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
        // Find audition blocks for the selected date
        const selectedDateString = selectedDate.toISOString().split('T')[0]; // Get just the date part
        
        const { data: auditionBlocks, error: blockError } = await supabase
          .from('audition_time_blocks')
          .select('*')
          .eq('is_active', true);

        if (blockError) {
          console.error('Error fetching audition blocks:', blockError);
          throw blockError;
        }

        // Filter blocks that match the selected date
        const matchingBlocks = auditionBlocks?.filter(block => {
          const blockDateString = new Date(block.start_date).toISOString().split('T')[0];
          return blockDateString === selectedDateString;
        }) || [];

        console.log('Checking audition blocks for date:', selectedDateString);
        console.log('Found matching audition blocks:', matchingBlocks);

        if (!matchingBlocks.length) {
          console.log('No audition blocks found for this date');
          setTimeSlots([]);
          return;
        }

        const auditionBlock = matchingBlocks[0];
        
        // Get existing audition appointments for this date
        const { data: existingAppointments, error: appointmentError } = await supabase
          .from('gw_auditions')
          .select('audition_date, audition_time')
          .gte('audition_date', startOfDay(selectedDate).toISOString())
          .lte('audition_date', endOfDay(selectedDate).toISOString());

        if (appointmentError) throw appointmentError;

        // Generate time slots based on the audition block's time range
        const appointmentDuration = auditionBlock.appointment_duration_minutes || 30;
        const slots: TimeSlot[] = [];
        
        // Use the block's start and end times instead of fixed 9 AM to 5 PM
        const blockStart = new Date(auditionBlock.start_date);
        const blockEnd = new Date(auditionBlock.end_date);
        
        // For the selected date, use the time from the block but the date from selectedDate
        const startTime = new Date(selectedDate);
        startTime.setHours(blockStart.getHours(), blockStart.getMinutes(), 0, 0);
        
        const endTime = new Date(selectedDate);
        endTime.setHours(blockEnd.getHours(), blockEnd.getMinutes(), 0, 0);
        
        console.log('Generating slots from', startTime, 'to', endTime, 'with duration', appointmentDuration);
        
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