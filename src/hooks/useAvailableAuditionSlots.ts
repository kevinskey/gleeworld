import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay, format } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

interface TimeSlot {
  time: string;
  isAvailable: boolean;
}

export const useAvailableAuditionSlots = (selectedDate: Date | null) => {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [availableDates, setAvailableDates] = useState<Date[]>([]);
  
  // Eastern timezone identifier
  const EASTERN_TZ = 'America/New_York';

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
          // Use the local date from the database timestamp
          const blockDate = new Date(block.start_date);
          
          // Create a clean date object (midnight local time) for the date
          const cleanDate = new Date(blockDate.getFullYear(), blockDate.getMonth(), blockDate.getDate());
          
          // Only add the date if it's not already in the array
          const dateExists = dates.some(date => 
            date.toDateString() === cleanDate.toDateString()
          );
          
          if (!dateExists) {
            dates.push(cleanDate);
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
        // Get the selected date in YYYY-MM-DD format in the user's local timezone
        const selectedDateString = format(selectedDate, 'yyyy-MM-dd');
        
        const { data: auditionBlocks, error: blockError } = await supabase
          .from('audition_time_blocks')
          .select('*')
          .eq('is_active', true);

        if (blockError) {
          console.error('Error fetching audition blocks:', blockError);
          throw blockError;
        }

        // Filter blocks that match the selected date (compare local dates)
        const matchingBlocks = auditionBlocks?.filter(block => {
          const blockStartDate = new Date(block.start_date);
          const blockDateString = format(blockStartDate, 'yyyy-MM-dd');
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
          .from('audition_applications')
          .select('audition_time_slot')
          .gte('audition_time_slot', startOfDay(selectedDate).toISOString())
          .lte('audition_time_slot', endOfDay(selectedDate).toISOString());

        if (appointmentError) throw appointmentError;

        // Generate time slots based on the audition block's time range
        const appointmentDuration = auditionBlock.appointment_duration_minutes || 30;
        const slots: TimeSlot[] = [];
        
        // Get the actual start and end times from the audition block
        const blockStartUTC = new Date(auditionBlock.start_date);
        const blockEndUTC = new Date(auditionBlock.end_date);
        
        // Create the start and end times for the selected date using local time
        const startTime = new Date(selectedDate);
        startTime.setHours(blockStartUTC.getHours(), blockStartUTC.getMinutes(), 0, 0);
        
        const endTime = new Date(selectedDate);
        endTime.setHours(blockEndUTC.getHours(), blockEndUTC.getMinutes(), 0, 0);
        
        console.log('Block times (UTC):', blockStartUTC, 'to', blockEndUTC);
        console.log('Generated slot times for', selectedDateString, ':', startTime, 'to', endTime);
        console.log('Appointment duration:', appointmentDuration, 'minutes');
        
        const currentTime = new Date(startTime);
        
        while (currentTime < endTime) {
          const timeString = format(currentTime, 'h:mm a');
          
          // Check if this slot is already taken
          const isAvailable = !existingAppointments?.some(apt => {
            const takenTime = format(new Date(apt.audition_time_slot), 'h:mm a');
            return takenTime === timeString;
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