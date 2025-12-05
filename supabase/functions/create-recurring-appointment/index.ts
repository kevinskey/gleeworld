import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateRecurringAppointmentRequest {
  title: string;
  description?: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  appointment_type: string;
  duration_minutes: number;
  appointment_date: string;
  assigned_to?: string;
  created_by?: string;
  recurrence_type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  recurrence_interval: number;
  recurrence_days_of_week?: number[];
  recurrence_end_date?: string;
  max_occurrences?: number;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const requestData: CreateRecurringAppointmentRequest = await req.json();
    console.log('Creating recurring appointment:', { 
      title: requestData.title,
      recurrence_type: requestData.recurrence_type,
      user_id: user.id 
    });

    // Create the parent appointment first
    const { data: parentAppointment, error: parentError } = await supabase
      .from('gw_appointments')
      .insert({
        title: requestData.title,
        description: requestData.description,
        client_name: requestData.client_name,
        client_email: requestData.client_email,
        client_phone: requestData.client_phone,
        appointment_type: requestData.appointment_type,
        duration_minutes: requestData.duration_minutes,
        appointment_date: requestData.appointment_date,
        assigned_to: requestData.assigned_to || user.id,
        created_by: requestData.created_by || user.id,
        status: 'pending_approval',
        is_recurring: true,
        recurrence_type: requestData.recurrence_type,
        recurrence_interval: requestData.recurrence_interval,
        recurrence_days_of_week: requestData.recurrence_days_of_week,
        recurrence_end_date: requestData.recurrence_end_date,
        max_occurrences: requestData.max_occurrences,
      })
      .select()
      .single();

    if (parentError) {
      console.error('Error creating parent appointment:', parentError);
      throw parentError;
    }

    console.log('Parent appointment created:', parentAppointment.id);

    // Generate recurring appointments
    const appointments = [];
    let currentDate = new Date(requestData.appointment_date);
    let occurrenceCount = 0;
    const endDate = requestData.recurrence_end_date ? new Date(requestData.recurrence_end_date) : null;
    const maxOccurrences = requestData.max_occurrences || 50;

    while (occurrenceCount < maxOccurrences) {
      let nextDate: Date;

      // Calculate next occurrence based on recurrence type
      switch (requestData.recurrence_type) {
        case 'daily':
          nextDate = new Date(currentDate.getTime() + (requestData.recurrence_interval * 24 * 60 * 60 * 1000));
          break;
        case 'weekly':
          if (requestData.recurrence_days_of_week && requestData.recurrence_days_of_week.length > 0) {
            // Find next day in the week pattern
            let foundNext = false;
            nextDate = new Date(currentDate.getTime() + (24 * 60 * 60 * 1000)); // Start from next day
            
            for (let i = 0; i < 7; i++) {
              if (requestData.recurrence_days_of_week.includes(nextDate.getDay())) {
                foundNext = true;
                break;
              }
              nextDate = new Date(nextDate.getTime() + (24 * 60 * 60 * 1000));
            }
            
            if (!foundNext) {
              // If no day found in current week, move to next week cycle
              nextDate = new Date(currentDate.getTime() + (requestData.recurrence_interval * 7 * 24 * 60 * 60 * 1000));
              // Find first matching day in the new cycle
              while (!requestData.recurrence_days_of_week.includes(nextDate.getDay())) {
                nextDate = new Date(nextDate.getTime() + (24 * 60 * 60 * 1000));
              }
            }
          } else {
            nextDate = new Date(currentDate.getTime() + (requestData.recurrence_interval * 7 * 24 * 60 * 60 * 1000));
          }
          break;
        case 'monthly':
          nextDate = new Date(currentDate);
          nextDate.setMonth(nextDate.getMonth() + requestData.recurrence_interval);
          break;
        case 'yearly':
          nextDate = new Date(currentDate);
          nextDate.setFullYear(nextDate.getFullYear() + requestData.recurrence_interval);
          break;
        default:
          throw new Error('Invalid recurrence type');
      }

      // Check end conditions
      if (endDate && nextDate > endDate) {
        break;
      }

      // Don't create appointments too far in the future
      const twoYearsFromNow = new Date();
      twoYearsFromNow.setFullYear(twoYearsFromNow.getFullYear() + 2);
      if (nextDate > twoYearsFromNow) {
        break;
      }

      appointments.push({
        title: requestData.title,
        description: requestData.description,
        client_name: requestData.client_name,
        client_email: requestData.client_email,
        client_phone: requestData.client_phone,
        appointment_type: requestData.appointment_type,
        duration_minutes: requestData.duration_minutes,
        appointment_date: nextDate.toISOString(),
        assigned_to: requestData.assigned_to || user.id,
        created_by: requestData.created_by || user.id,
        status: 'pending_approval',
        is_recurring: true,
        parent_appointment_id: parentAppointment.id,
      });

      currentDate = nextDate;
      occurrenceCount++;

      // Safety check to prevent infinite loops
      if (occurrenceCount > 100) {
        console.warn('Stopping appointment generation at 100 occurrences');
        break;
      }
    }

    // Insert all recurring appointments in batches
    if (appointments.length > 0) {
      const batchSize = 10;
      for (let i = 0; i < appointments.length; i += batchSize) {
        const batch = appointments.slice(i, i + batchSize);
        const { error: batchError } = await supabase
          .from('gw_appointments')
          .insert(batch);

        if (batchError) {
          console.error('Error inserting batch:', batchError);
          throw batchError;
        }
      }
    }

    console.log(`Successfully created ${appointments.length + 1} appointments (1 parent + ${appointments.length} recurring)`);

    // Send notification SMS to admin
    try {
      const adminPhone = '+14706221392';
      await supabase.functions.invoke('gw-send-sms', {
        body: {
          to: adminPhone,
          message: `New recurring appointment series from ${requestData.client_name}. ${appointments.length + 1} appointments created. Type: ${requestData.appointment_type}. First appointment: ${new Date(requestData.appointment_date).toLocaleDateString()}`
        }
      });
    } catch (smsError) {
      console.error('SMS sending failed:', smsError);
      // Don't fail the appointment creation if SMS fails
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Successfully created ${appointments.length + 1} recurring appointments`,
      parent_appointment_id: parentAppointment.id,
      appointments_created: appointments.length + 1
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error('Error in create-recurring-appointment function:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Failed to create recurring appointment',
      details: error.toString()
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json', 
        ...corsHeaders 
      },
    });
  }
};

serve(handler);