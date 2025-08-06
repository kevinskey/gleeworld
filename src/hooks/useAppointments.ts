import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Appointment {
  id: string;
  service_id: string;
  user_id?: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  status: 'confirmed' | 'pending' | 'cancelled';
  attendee_count: number;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  special_requests?: string;
  notes?: string;
  cancellation_reason?: string;
  cancelled_at?: string;
  created_at: string;
  updated_at: string;
}

export interface BookingRequest {
  service_id: string;
  appointment_date: string;
  start_time: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  attendee_count?: number;
  special_requests?: string;
}

export interface TimeSlot {
  start_time: string;
  end_time: string;
  available: boolean;
}

export interface BookingResult {
  success: boolean;
  appointment_id?: string;
  status?: string;
  message?: string;
  error?: string;
}

export const useAppointments = () => {
  return useQuery({
    queryKey: ['gw-appointments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_appointments')
        .select('*')
        .order('appointment_date', { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as Appointment[];
    },
  });
};

export const useUserAppointments = () => {
  return useQuery({
    queryKey: ['user-appointments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_appointments')
        .select('*, gw_services(name, location)')
        .order('appointment_date', { ascending: true });

      if (error) throw error;
      return data;
    },
  });
};

export const useAvailableTimeSlots = (serviceId: string, date: string) => {
  return useQuery({
    queryKey: ['time-slots', serviceId, date],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_available_time_slots', {
          p_service_id: serviceId,
          p_date: date
        });

      if (error) throw error;
      return (data || []) as TimeSlot[];
    },
    enabled: !!serviceId && !!date,
  });
};

export const useCheckAvailability = () => {
  return useMutation({
    mutationFn: async ({ 
      serviceId, 
      appointmentDate, 
      startTime, 
      durationMinutes 
    }: {
      serviceId: string;
      appointmentDate: string;
      startTime: string;
      durationMinutes: number;
    }) => {
      const { data, error } = await supabase
        .rpc('check_appointment_availability', {
          p_service_id: serviceId,
          p_appointment_date: appointmentDate,
          p_start_time: startTime,
          p_duration_minutes: durationMinutes
        });

      if (error) throw error;
      return data as unknown as { available: boolean; error?: string; service?: any };
    },
  });
};

export const useBookAppointment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookingData: BookingRequest) => {
      const { data, error } = await supabase
        .rpc('book_appointment', {
          p_service_id: bookingData.service_id,
          p_appointment_date: bookingData.appointment_date,
          p_start_time: bookingData.start_time,
          p_customer_name: bookingData.customer_name,
          p_customer_email: bookingData.customer_email,
          p_customer_phone: bookingData.customer_phone,
          p_attendee_count: bookingData.attendee_count || 1,
          p_special_requests: bookingData.special_requests
        });

      if (error) throw error;
      return data as unknown as BookingResult;
    },
    onSuccess: (result: BookingResult) => {
      queryClient.invalidateQueries({ queryKey: ['gw-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['user-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['time-slots'] });
      
      if (result.success) {
        toast.success(result.message || 'Appointment booked successfully!');
      } else {
        toast.error(result.error || 'Failed to book appointment');
      }
    },
    onError: (error) => {
      toast.error('Failed to book appointment: ' + error.message);
    },
  });
};

export const useCancelAppointment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      appointmentId, 
      reason 
    }: {
      appointmentId: string;
      reason?: string;
    }) => {
      const { data, error } = await supabase
        .from('gw_appointments')
        .update({
          status: 'cancelled',
          cancellation_reason: reason,
          cancelled_at: new Date().toISOString()
        })
        .eq('id', appointmentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gw-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['user-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['time-slots'] });
      toast.success('Appointment cancelled successfully');
    },
    onError: (error) => {
      toast.error('Failed to cancel appointment: ' + error.message);
    },
  });
};