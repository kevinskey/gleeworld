import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TwilioWebhook {
  Body: string;
  From: string;
  To: string;
  MessageSid: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse Twilio webhook data (URL-encoded form data)
    const formData = await req.formData();
    const body = formData.get('Body')?.toString().toUpperCase() || '';
    const from = formData.get('From')?.toString() || '';
    const messageSid = formData.get('MessageSid')?.toString() || '';

    console.log('Received SMS webhook:', { body, from, messageSid });

    // Parse the message for APPROVE/DENY followed by appointment ID
    const approveMatch = body.match(/APPROVE\s+([a-f0-9-]{36})/i);
    const denyMatch = body.match(/DENY\s+([a-f0-9-]{36})/i);
    
    let appointmentId: string | null = null;
    let action: string | null = null;

    if (approveMatch) {
      appointmentId = approveMatch[1];
      action = 'approved';
    } else if (denyMatch) {
      appointmentId = denyMatch[1];
      action = 'denied';
    }

    if (!appointmentId || !action) {
      // Send help message back to admin
      await sendSMSResponse(from, 'Invalid format. Please reply with "APPROVE [appointment_id]" or "DENY [appointment_id]"');
      return new Response('Invalid format', { status: 200 });
    }

    // Get the appointment
    const { data: appointment, error: fetchError } = await supabase
      .from('gw_appointments')
      .select('*')
      .eq('id', appointmentId)
      .single();

    if (fetchError || !appointment) {
      await sendSMSResponse(from, `Appointment ${appointmentId} not found.`);
      return new Response('Appointment not found', { status: 200 });
    }

    // Update appointment status
    const newStatus = action === 'approved' ? 'confirmed' : 'cancelled';
    const { error: updateError } = await supabase
      .from('gw_appointments')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId);

    if (updateError) {
      console.error('Error updating appointment:', updateError);
      await sendSMSResponse(from, 'Error processing your response. Please try again.');
      return new Response('Update error', { status: 500 });
    }

    // Send confirmation to admin
    await sendSMSResponse(from, `Appointment ${appointmentId} has been ${action}.`);

    // Send notification to client
    const clientMessage = action === 'approved' 
      ? `Great news! Your appointment for ${new Date(appointment.appointment_date).toLocaleDateString()} has been confirmed.`
      : `Your appointment request for ${new Date(appointment.appointment_date).toLocaleDateString()} has been cancelled. Please reschedule if needed.`;

    await sendSMSResponse(appointment.client_phone, clientMessage);

    console.log(`Appointment ${appointmentId} ${action} successfully`);

    return new Response('SMS processed successfully', {
      status: 200,
      headers: { 'Content-Type': 'text/plain', ...corsHeaders }
    });

  } catch (error: any) {
    console.error('Error in SMS approval handler:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

async function sendSMSResponse(to: string, message: string) {
  try {
    await supabase.functions.invoke('send-sms', {
      body: { to, message }
    });
  } catch (error) {
    console.error('Error sending SMS response:', error);
  }
}

serve(handler);