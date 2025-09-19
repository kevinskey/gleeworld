import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type DbAppointment = Database['public']['Tables']['gw_appointments']['Row'];
type DbAppointmentInsert = Database['public']['Tables']['gw_appointments']['Insert'];
type DbAppointmentUpdate = Database['public']['Tables']['gw_appointments']['Update'];
type DbEvent = Database['public']['Tables']['gw_events']['Row'];
type DbEventInsert = Database['public']['Tables']['gw_events']['Insert'];

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
  calendarId?: string;
}

// Get the Appointments calendar ID
const getAppointmentsCalendarId = async (): Promise<string | null> => {
  const { data, error } = await supabase
    .from('gw_calendars')
    .select('id')
    .eq('name', 'Appointments')
    .single();
    
  if (error) {
    console.error('Error fetching Appointments calendar:', error);
    return null;
  }
  
  return data?.id || null;
};

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

// Convert component format to database format with provider assignment
const convertAppointmentToDb = async (appt: Omit<Appointment, 'id'>): Promise<DbAppointmentInsert> => {
  // Combine date and time
  const [hours, minutes] = appt.time.split(':').map(Number);
  const appointmentDateTime = new Date(appt.date);
  appointmentDateTime.setHours(hours, minutes, 0, 0);

  // Get service category for appointment_type
  let appointmentType = 'general'; // Default fallback
  if (appt.service) {
    const { data: service } = await supabase
      .from('gw_services')
      .select('category')
      .eq('id', appt.service)
      .single();
    
    if (service?.category) {
      appointmentType = service.category;
    }
  }

  // Get current user's provider ID
  let providerId = null;
  const { data: currentUser } = await supabase.auth.getUser();
  if (currentUser.user) {
    const { data: provider } = await supabase
      .from('gw_service_providers')
      .select('id')
      .eq('user_id', currentUser.user.id)
      .single();
    
    if (provider) {
      providerId = provider.id;
    }
  }

  return {
    title: appt.title,
    client_name: appt.clientName,
    client_email: appt.clientEmail,
    client_phone: appt.clientPhone || null,
    appointment_type: appointmentType,
    appointment_date: appointmentDateTime.toISOString(),
    duration_minutes: appt.duration,
    status: appt.status === 'confirmed' ? 'scheduled' : appt.status,
    description: appt.notes || null,
    notes: appt.notes || null,
    provider_id: providerId
  };
};

// Create calendar event for appointment
const createCalendarEvent = async (appointment: Appointment, calendarId: string): Promise<void> => {
  const [hours, minutes] = appointment.time.split(':').map(Number);
  const startDateTime = new Date(appointment.date);
  startDateTime.setHours(hours, minutes, 0, 0);
  
  const endDateTime = new Date(startDateTime);
  endDateTime.setMinutes(endDateTime.getMinutes() + appointment.duration);

  const eventData: DbEventInsert = {
    title: appointment.title,
    description: `Appointment with ${appointment.clientName}\nService: ${appointment.service}\nEmail: ${appointment.clientEmail}${appointment.clientPhone ? `\nPhone: ${appointment.clientPhone}` : ''}${appointment.notes ? `\nNotes: ${appointment.notes}` : ''}`,
    start_date: startDateTime.toISOString().split('T')[0],
    end_date: startDateTime.toISOString().split('T')[0],
    location: null,
    event_type: 'appointment',
    is_public: false,
    calendar_id: calendarId
  };

  const { error } = await supabase
    .from('gw_events')
    .insert(eventData);

  if (error) {
    console.error('Error creating calendar event:', error);
    throw error;
  }
};

// Update calendar event for appointment
const updateCalendarEvent = async (appointment: Appointment, calendarId: string): Promise<void> => {
  const [hours, minutes] = appointment.time.split(':').map(Number);
  const startDateTime = new Date(appointment.date);
  startDateTime.setHours(hours, minutes, 0, 0);
  
  const endDateTime = new Date(startDateTime);
  endDateTime.setMinutes(endDateTime.getMinutes() + appointment.duration);

  // Find existing event by title and type
  const { data: existingEvents } = await supabase
    .from('gw_events')
    .select('id')
    .eq('event_type', 'appointment')
    .ilike('title', `%${appointment.clientName}%`)
    .eq('calendar_id', calendarId);

  if (existingEvents && existingEvents.length > 0) {
    const { error } = await supabase
      .from('gw_events')
      .update({
        title: appointment.title,
        description: `Appointment with ${appointment.clientName}\nService: ${appointment.service}\nEmail: ${appointment.clientEmail}${appointment.clientPhone ? `\nPhone: ${appointment.clientPhone}` : ''}${appointment.notes ? `\nNotes: ${appointment.notes}` : ''}`,
        start_date: startDateTime.toISOString().split('T')[0],
        end_date: startDateTime.toISOString().split('T')[0]
      })
      .eq('id', existingEvents[0].id);

    if (error) {
      console.error('Error updating calendar event:', error);
      throw error;
    }
  }
};

// Delete calendar event for appointment
const deleteCalendarEvent = async (appointment: Appointment, calendarId: string): Promise<void> => {
  const { error } = await supabase
    .from('gw_events')
    .delete()
    .eq('event_type', 'appointment')
    .ilike('title', `%${appointment.clientName}%`)
    .eq('calendar_id', calendarId);

  if (error) {
    console.error('Error deleting calendar event:', error);
    throw error;
  }
};

// Hook to get appointments for the current provider only
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
      const dbData = await convertAppointmentToDb(appointment);
      
      const { data, error } = await supabase
        .from('gw_appointments')
        .insert(dbData)
        .select()
        .single();

      if (error) {
        console.error('Error creating appointment:', error);
        throw error;
      }

      const createdAppointment = convertDbToAppointment(data);

      // Create corresponding calendar event
      const calendarId = await getAppointmentsCalendarId();
      if (calendarId) {
        try {
          await createCalendarEvent(createdAppointment, calendarId);
        } catch (calendarError) {
          console.error('Error creating calendar event:', calendarError);
          // Don't fail the appointment creation if calendar fails
        }
      }

      return createdAppointment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['real-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['events'] }); // Refresh calendar
      toast.success('Appointment created and added to calendar!');
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
      
      // Handle service/appointment_type - need to get the service category
      if (updates.service) {
        // If service is a service ID, get the category
        const { data: service } = await supabase
          .from('gw_services')
          .select('category')
          .eq('id', updates.service)
          .single();
        
        if (service?.category) {
          dbUpdates.appointment_type = service.category;
        } else {
          // Fallback to 'general' if service not found or no category
          dbUpdates.appointment_type = 'general';
        }
      }
      
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

      const updatedAppointment = convertDbToAppointment(data);

      // Update corresponding calendar event
      const calendarId = await getAppointmentsCalendarId();
      if (calendarId) {
        try {
          await updateCalendarEvent(updatedAppointment, calendarId);
        } catch (calendarError) {
          console.error('Error updating calendar event:', calendarError);
          // Don't fail the appointment update if calendar fails
        }
      }

      return updatedAppointment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['real-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['events'] }); // Refresh calendar
      toast.success('Appointment updated and calendar synchronized!');
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
      // Get appointment details before deletion for calendar cleanup
      const { data: appointment } = await supabase
        .from('gw_appointments')
        .select('*')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('gw_appointments')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting appointment:', error);
        throw error;
      }

      // Delete corresponding calendar event
      if (appointment) {
        const calendarId = await getAppointmentsCalendarId();
        if (calendarId) {
          try {
            const apptData = convertDbToAppointment(appointment);
            await deleteCalendarEvent(apptData, calendarId);
          } catch (calendarError) {
            console.error('Error deleting calendar event:', calendarError);
            // Don't fail the appointment deletion if calendar fails
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['real-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['events'] }); // Refresh calendar
      toast.success('Appointment deleted and removed from calendar!');
    },
    onError: (error: any) => {
      console.error('Failed to delete appointment:', error);
      toast.error('Failed to delete appointment. Please try again.');
    }
  });
};