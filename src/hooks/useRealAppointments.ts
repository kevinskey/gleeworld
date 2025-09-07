import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type DbAppointment = Database['public']['Tables']['gw_appointments']['Row'];
type DbAppointmentInsert = Database['public']['Tables']['gw_appointments']['Insert'];
type DbAppointmentUpdate = Database['public']['Tables']['gw_appointments']['Update'];

export interface Appointment {
  id: string;
  title: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  service: string;
  date: Date;
  time: string;
  duration: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
}

// Convert database format to component format
const convertDbToAppointment = (dbAppt: DbAppointment): Appointment => {
  const appointmentDate = new Date(dbAppt.appointment_date);
  return {
    id: dbAppt.id,
    title: dbAppt.title || `${dbAppt.appointment_type} with ${dbAppt.client_name}`,
    clientName: dbAppt.client_name,
    clientEmail: dbAppt.client_email,
    clientPhone: dbAppt.client_phone || undefined,
    service: dbAppt.appointment_type || 'General',
    date: appointmentDate,
    time: appointmentDate.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: false 
    }),
    duration: dbAppt.duration_minutes || 30,
    status: dbAppt.status === 'scheduled' ? 'confirmed' : 
           (dbAppt.status as 'pending' | 'completed' | 'cancelled') || 'pending',
    notes: dbAppt.notes || dbAppt.description || undefined
  };
};

// Convert component format to database format
const convertAppointmentToDb = (appt: Omit<Appointment, 'id'>): DbAppointmentInsert => {
  // Combine date and time
  const [hours, minutes] = appt.time.split(':').map(Number);
  const appointmentDateTime = new Date(appt.date);
  appointmentDateTime.setHours(hours, minutes, 0, 0);

  return {
    title: appt.title,
    client_name: appt.clientName,
    client_email: appt.clientEmail,
    client_phone: appt.clientPhone || null,
    appointment_type: appt.service,
    appointment_date: appointmentDateTime.toISOString(),
    duration_minutes: appt.duration,
    status: appt.status === 'confirmed' ? 'scheduled' : appt.status,
    description: appt.notes || null,
    notes: appt.notes || null
  };
};

export const useRealAppointments = () => {
  return useQuery({
    queryKey: ['real-appointments'],
    queryFn: async (): Promise<Appointment[]> => {
      const { data, error } = await supabase
        .from('gw_appointments')
        .select('*')
        .order('appointment_date', { ascending: true });

      if (error) {
        console.error('Error fetching appointments:', error);
        throw error;
      }

      return (data || []).map(convertDbToAppointment);
    }
  });
};

export const useCreateRealAppointment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (appointment: Omit<Appointment, 'id'>): Promise<Appointment> => {
      const dbData = convertAppointmentToDb(appointment);
      
      const { data, error } = await supabase
        .from('gw_appointments')
        .insert(dbData)
        .select()
        .single();

      if (error) {
        console.error('Error creating appointment:', error);
        throw error;
      }

      return convertDbToAppointment(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['real-appointments'] });
      toast.success('Appointment created successfully!');
    },
    onError: (error: any) => {
      console.error('Failed to create appointment:', error);
      toast.error('Failed to create appointment. Please try again.');
    }
  });
};

export const useUpdateRealAppointment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Appointment> }): Promise<Appointment> => {
      // Convert updates to database format
      const dbUpdates: DbAppointmentUpdate = {};
      
      if (updates.title) dbUpdates.title = updates.title;
      if (updates.clientName) dbUpdates.client_name = updates.clientName;
      if (updates.clientEmail) dbUpdates.client_email = updates.clientEmail;
      if (updates.clientPhone !== undefined) dbUpdates.client_phone = updates.clientPhone || null;
      if (updates.service) dbUpdates.appointment_type = updates.service;
      if (updates.duration) dbUpdates.duration_minutes = updates.duration;
      if (updates.status) dbUpdates.status = updates.status === 'confirmed' ? 'scheduled' : updates.status;
      if (updates.notes !== undefined) {
        dbUpdates.description = updates.notes || null;
        dbUpdates.notes = updates.notes || null;
      }
      
      // Handle date and time updates
      if (updates.date || updates.time) {
        // Get current appointment to merge date/time
        const { data: current } = await supabase
          .from('gw_appointments')
          .select('appointment_date')
          .eq('id', id)
          .single();
          
        const currentDate = current ? new Date(current.appointment_date) : new Date();
        const date = updates.date || currentDate;
        const time = updates.time || currentDate.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit', 
          hour12: false 
        });
        
        const [hours, minutes] = time.split(':').map(Number);
        const appointmentDateTime = new Date(date);
        appointmentDateTime.setHours(hours, minutes, 0, 0);
        dbUpdates.appointment_date = appointmentDateTime.toISOString();
      }

      const { data, error } = await supabase
        .from('gw_appointments')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating appointment:', error);
        throw error;
      }

      return convertDbToAppointment(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['real-appointments'] });
      toast.success('Appointment updated successfully!');
    },
    onError: (error: any) => {
      console.error('Failed to update appointment:', error);
      toast.error('Failed to update appointment. Please try again.');
    }
  });
};

export const useDeleteRealAppointment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('gw_appointments')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting appointment:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['real-appointments'] });
      toast.success('Appointment deleted successfully!');
    },
    onError: (error: any) => {
      console.error('Failed to delete appointment:', error);
      toast.error('Failed to delete appointment. Please try again.');
    }
  });
};