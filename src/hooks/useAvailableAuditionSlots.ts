import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

interface TimeSlot {
  time: string;
  isAvailable: boolean;
  auditionerName?: string;
}

export const useAvailableAuditionSlots = (selectedDate: Date | null) => {
  console.log('🎯 useAvailableAuditionSlots hook called with selectedDate:', selectedDate);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [availableDates, setAvailableDates] = useState<Date[]>([]);
  
  // Eastern timezone identifier
  const EASTERN_TZ = 'America/New_York';

  // Fetch available audition dates from time blocks
  useEffect(() => {
    const fetchAuditionDates = async () => {
      try {
        console.log('🔍 Fetching audition dates from audition_time_blocks...');
        const { data: timeBlocks, error } = await supabase
          .from('audition_time_blocks')
          .select('*')
          .eq('is_active', true);

        if (error) {
          console.error('Error fetching time blocks:', error);
          throw error;
        }

        console.log('📊 Time blocks from database:', timeBlocks);

        // Extract unique dates from time blocks
        const uniqueDatesSet = new Set<string>();
        timeBlocks?.forEach(block => {
          if (block.start_date) {
            // Convert UTC to Eastern and get the date
            const blockStartEastern = toZonedTime(new Date(block.start_date), EASTERN_TZ);
            const dateString = blockStartEastern.toISOString().split('T')[0];
            uniqueDatesSet.add(dateString);
          }
        });

        const dates = Array.from(uniqueDatesSet)
          .map(dateString => new Date(dateString + 'T00:00:00'))
          .sort((a, b) => a.getTime() - b.getTime());

        console.log('📅 Available audition dates:', dates);
        setAvailableDates(dates);
      } catch (error) {
        console.error('Error fetching audition dates:', error);
      }
    };

    fetchAuditionDates();
  }, []);

  // Fetch auditions for selected date and generate time slots
  useEffect(() => {
    if (!selectedDate) {
      setTimeSlots([]);
      return;
    }

    const fetchSlotsFromAuditions = async () => {
      setLoading(true);
      try {
        const selectedDateString = selectedDate.toISOString().split('T')[0];
        console.log('🔍 Fetching auditions for date:', selectedDateString);
        console.log('🔍 Selected date object:', selectedDate);
        
        const { data: auditions, error } = await supabase
          .from('gw_auditions')
          .select('id, first_name, last_name, audition_date, audition_time, status')
          .eq('audition_date', selectedDateString)
          .order('audition_time');

        if (error) {
          console.error('Error fetching auditions:', error);
          throw error;
        }

        console.log('📋 Found auditions for date:', auditions);

        // Convert auditions to time slots
        const slots: TimeSlot[] = [];
        
        if (auditions && auditions.length > 0) {
          auditions.forEach(audition => {
            let timeString = audition.audition_time;
            
            // Handle different time formats
            if (timeString.includes('AM') || timeString.includes('PM')) {
              // Already in 12-hour format, use as is
              const formattedTime = timeString;
              slots.push({
                time: formattedTime,
                isAvailable: false,
                auditionerName: `${audition.first_name} ${audition.last_name}`.trim()
              });
            } else {
              // Convert from 24-hour format to 12-hour format
              const [hours, minutes] = timeString.split(':').map(Number);
              const date = new Date();
              date.setHours(hours, minutes, 0, 0);
              const formattedTime = format(date, 'h:mm a');
              
              slots.push({
                time: formattedTime,
                isAvailable: false,
                auditionerName: `${audition.first_name} ${audition.last_name}`.trim()
              });
            }
          });
        }

        console.log('🔍 Fetching booked appointments for date:', selectedDateString);
        console.log('🔍 Date range query:', selectedDateString + 'T00:00:00.000Z', 'to', new Date(new Date(selectedDateString + 'T00:00:00.000Z').getTime() + 24 * 60 * 60 * 1000).toISOString());
        const { data: appointments, error: appointmentsError } = await supabase
          .from('gw_appointments')
          .select('id, client_name, appointment_date, status')
          .eq('appointment_type', 'audition')
          .gte('appointment_date', selectedDateString + 'T00:00:00.000Z')
          .lt('appointment_date', new Date(new Date(selectedDateString + 'T00:00:00.000Z').getTime() + 24 * 60 * 60 * 1000).toISOString())
          .eq('status', 'scheduled');

        if (!appointmentsError && appointments && appointments.length > 0) {
          console.log('📋 Found booked appointments:', appointments);
          appointments.forEach(appointment => {
            console.log('Processing appointment:', appointment);
            const appointmentDate = new Date(appointment.appointment_date);
            console.log('Appointment raw date:', appointment.appointment_date);
            console.log('Parsed appointment date:', appointmentDate);
            const easternTime = toZonedTime(appointmentDate, EASTERN_TZ);
            console.log('Eastern time:', easternTime);
            const timeString = format(easternTime, 'h:mm a');
            console.log('Formatted time string:', timeString);
            
            // Check if this slot is already marked as unavailable
            const existingSlotIndex = slots.findIndex(slot => slot.time === timeString);
            if (existingSlotIndex >= 0) {
              // Update existing slot
              slots[existingSlotIndex] = {
                time: timeString,
                isAvailable: false,
                auditionerName: appointment.client_name
              };
            } else {
              // Add new booked slot
              slots.push({
                time: timeString,
                isAvailable: false,
                auditionerName: appointment.client_name
              });
            }
          });
        }

        // Also check for available time slots from time blocks if they exist
        const { data: timeBlocks, error: blockError } = await supabase
          .from('audition_time_blocks')
          .select('*')
          .eq('is_active', true);

        if (!blockError && timeBlocks && timeBlocks.length > 0) {
          const matchingBlocks = timeBlocks.filter(block => {
            const blockStartDateEastern = toZonedTime(new Date(block.start_date), EASTERN_TZ);
            const blockDateString = format(blockStartDateEastern, 'yyyy-MM-dd');
            return blockDateString === selectedDateString;
          });

          if (matchingBlocks.length > 0) {
            const auditionBlock = matchingBlocks[0];
            const appointmentDuration = auditionBlock.appointment_duration_minutes || 30;
            
            // Generate available slots from time blocks
            const blockStartEastern = toZonedTime(new Date(auditionBlock.start_date), EASTERN_TZ);
            const blockEndEastern = toZonedTime(new Date(auditionBlock.end_date), EASTERN_TZ);
            
            const startTime = new Date(selectedDate);
            startTime.setHours(blockStartEastern.getHours(), blockStartEastern.getMinutes(), 0, 0);
            
            const endTime = new Date(selectedDate);
            endTime.setHours(blockEndEastern.getHours(), blockEndEastern.getMinutes(), 0, 0);
            
            const currentTime = new Date(startTime);
            
            while (currentTime < endTime) {
              const timeString = format(currentTime, 'h:mm a');
              
              // Check if this slot is already booked
              const isBooked = slots.some(slot => slot.time === timeString);
              
              if (!isBooked) {
                slots.push({
                  time: timeString,
                  isAvailable: true
                });
              }
              
              currentTime.setMinutes(currentTime.getMinutes() + appointmentDuration);
            }
          }
        }

        // Sort slots by time
        slots.sort((a, b) => {
          const timeA = new Date(`1970-01-01 ${a.time}`);
          const timeB = new Date(`1970-01-01 ${b.time}`);
          return timeA.getTime() - timeB.getTime();
        });

        console.log('⏰ Generated time slots:', slots);
        setTimeSlots(slots);
      } catch (error) {
        console.error('Error fetching slots:', error);
        setTimeSlots([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSlotsFromAuditions();
  }, [selectedDate]);

  return {
    timeSlots: timeSlots.filter(slot => slot.isAvailable).map(slot => slot.time),
    allTimeSlots: timeSlots,
    loading,
    availableDates
  };
};