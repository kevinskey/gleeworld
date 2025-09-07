import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { addDays, format, parseISO } from 'date-fns';

export interface AppointmentService {
  id: string;
  name: string;
  description?: string;
  duration_minutes: number;
  price?: number;
  is_active: boolean;
  max_attendees: number;
  location?: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface SimpleAppointment {
  id: string;
  service_id: string;
  client_name: string;
  client_email: string;
  client_phone?: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  created_at: string;
  updated_at: string;
  service?: AppointmentService;
}

export interface BookingData {
  service_id: string;
  client_name: string;
  client_email: string;
  client_phone?: string;
  appointment_date: string;
  start_time: string;
  notes?: string;
}

// Hook to get all appointment services
export const useAppointmentServices = () => {
  return useQuery({
    queryKey: ['appointment-services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_appointment_services')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as AppointmentService[];
    },
  });
};

// Hook to get all appointments (admin view)
export const useAllAppointments = () => {
  return useQuery({
    queryKey: ['all-appointments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_simple_appointments')
        .select(`
          *,
          service:gw_appointment_services(*)
        `)
        .order('appointment_date', { ascending: true });

      if (error) throw error;
      return data as (SimpleAppointment & { service: AppointmentService })[];
    },
  });
};

// Hook to get available time slots for a specific date and service
export const useAvailableSlots = (serviceId?: string, date?: string) => {
  return useQuery({
    queryKey: ['available-slots', serviceId, date],
    queryFn: async () => {
      if (!serviceId || !date) return [];

      // Get service details first
      const { data: service, error: serviceError } = await supabase
        .from('gw_appointment_services')
        .select('duration_minutes')
        .eq('id', serviceId)
        .single();

      if (serviceError) throw serviceError;

      // Get existing appointments for the date
      const { data: appointments, error: appointmentsError } = await supabase
        .from('gw_simple_appointments')
        .select('start_time, end_time')
        .eq('appointment_date', date)
        .eq('service_id', serviceId)
        .neq('status', 'cancelled');

      if (appointmentsError) throw appointmentsError;

      // Generate available slots (9 AM to 5 PM in 30-minute intervals)
      const slots = [];
      const startHour = 9;
      const endHour = 17;
      
      for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const startTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          const endMinute = minute + service.duration_minutes;
          const endHour = hour + Math.floor(endMinute / 60);
          const finalEndMinute = endMinute % 60;
          const endTime = `${endHour.toString().padStart(2, '0')}:${finalEndMinute.toString().padStart(2, '0')}`;
          
          // Check if this slot conflicts with existing appointments
          const isBooked = appointments?.some(apt => {
            return (startTime >= apt.start_time && startTime < apt.end_time) ||
                   (endTime > apt.start_time && endTime <= apt.end_time) ||
                   (startTime <= apt.start_time && endTime >= apt.end_time);
          });

          if (!isBooked && endHour <= endHour) {
            slots.push({
              start_time: startTime,
              end_time: endTime,
              available: true
            });
          }
        }
      }

      return slots;
    },
    enabled: !!serviceId && !!date,
  });
};

// Hook to book an appointment
export const useBookNewAppointment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookingData: BookingData) => {
      // Get service details to calculate end time
      const { data: service, error: serviceError } = await supabase
        .from('gw_appointment_services')
        .select('duration_minutes')
        .eq('id', bookingData.service_id)
        .single();

      if (serviceError) throw serviceError;

      // Calculate end time
      const [hours, minutes] = bookingData.start_time.split(':').map(Number);
      const startMinutes = hours * 60 + minutes;
      const endMinutes = startMinutes + service.duration_minutes;
      const endHours = Math.floor(endMinutes / 60);
      const endMins = endMinutes % 60;
      const end_time = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;

      const { data, error } = await supabase
        .from('gw_simple_appointments')
        .insert({
          service_id: bookingData.service_id,
          client_name: bookingData.client_name,
          client_email: bookingData.client_email,
          client_phone: bookingData.client_phone,
          appointment_date: bookingData.appointment_date,
          start_time: bookingData.start_time,
          end_time,
          notes: bookingData.notes,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['available-slots'] });
      toast.success('Appointment booked successfully!');
    },
    onError: (error) => {
      toast.error('Failed to book appointment: ' + error.message);
    },
  });
};

// Hook to update appointment status
export const useUpdateAppointmentStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      appointmentId, 
      status 
    }: {
      appointmentId: string;
      status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
    }) => {
      const { data, error } = await supabase
        .from('gw_simple_appointments')
        .update({ status })
        .eq('id', appointmentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-appointments'] });
      toast.success('Appointment status updated!');
    },
    onError: (error) => {
      toast.error('Failed to update appointment: ' + error.message);
    },
  });
};

// Hook to manage appointment services
export const useManageServices = () => {
  const queryClient = useQueryClient();

  const createService = useMutation({
    mutationFn: async (serviceData: Omit<AppointmentService, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('gw_appointment_services')
        .insert(serviceData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment-services'] });
      toast.success('Service created successfully!');
    },
  });

  const updateService = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AppointmentService> & { id: string }) => {
      const { data, error } = await supabase
        .from('gw_appointment_services')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment-services'] });
      toast.success('Service updated successfully!');
    },
  });

  const deleteService = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('gw_appointment_services')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment-services'] });
      toast.success('Service deleted successfully!');
    },
  });

  return { createService, updateService, deleteService };
};