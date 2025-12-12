import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SMSWebhookPayload {
  From: string;
  Body: string;
  MessageSid: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Processing fitting approval SMS...');
    
    // Parse SMS payload (can be from Twilio webhook or JSON)
    let smsData: SMSWebhookPayload;
    const contentType = req.headers.get('content-type');
    
    if (contentType?.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      smsData = {
        From: formData.get('From') as string,
        Body: formData.get('Body') as string,
        MessageSid: formData.get('MessageSid') as string,
      };
    } else {
      smsData = await req.json();
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Received SMS from: ${smsData.From}, Body: ${smsData.Body}`);

    // Parse the SMS message for APPROVE/DENY commands
    const messageBody = smsData.Body.trim().toUpperCase();
    const approveMatch = messageBody.match(/APPROVE\s+([A-F0-9-]+)/);
    const denyMatch = messageBody.match(/DENY\s+([A-F0-9-]+)/);

    if (!approveMatch && !denyMatch) {
      console.log('SMS does not contain valid APPROVE/DENY command');
      return new Response('Invalid command format', { 
        status: 400,
        headers: corsHeaders 
      });
    }

    const appointmentId = approveMatch?.[1] || denyMatch?.[1];
    const isApproval = !!approveMatch;
    const action = isApproval ? 'APPROVED' : 'DENIED';

    console.log(`Processing ${action} for appointment ${appointmentId}`);

    // Verify the sender is authorized (wardrobe manager)
    const { data: profile } = await supabase
      .from('gw_profiles')
      .select('user_id, full_name, email')
      .eq('phone_number', smsData.From)
      .single();

    if (!profile) {
      console.error('Unauthorized phone number:', smsData.From);
      return new Response('Unauthorized', { 
        status: 403,
        headers: corsHeaders 
      });
    }

    // Check if sender is wardrobe manager or admin
    const { data: isWardrobeManager } = await supabase
      .from('gw_profiles')
      .select('is_admin, is_super_admin, exec_board_role')
      .eq('user_id', profile.user_id)
      .single();

    if (!isWardrobeManager?.is_admin && 
        !isWardrobeManager?.is_super_admin && 
        isWardrobeManager?.exec_board_role !== 'wardrobe_manager') {
      console.error('User is not authorized as wardrobe manager:', profile.email);
      return new Response('Unauthorized - Not a wardrobe manager', { 
        status: 403,
        headers: corsHeaders 
      });
    }

    // Get appointment details
    const { data: appointment, error: appointmentError } = await supabase
      .from('gw_appointments')
      .select('*')
      .eq('id', appointmentId)
      .eq('status', 'pending_approval')
      .single();

    if (appointmentError || !appointment) {
      console.error('Appointment not found or not pending approval:', appointmentError);
      return new Response('Appointment not found or already processed', { 
        status: 404,
        headers: corsHeaders 
      });
    }

    // Update appointment status
    const newStatus = isApproval ? 'confirmed' : 'cancelled';
    const { error: updateError } = await supabase
      .from('gw_appointments')
      .update({ 
        status: newStatus,
        approved_by: profile.user_id,
        approved_at: new Date().toISOString()
      })
      .eq('id', appointmentId);

    if (updateError) {
      console.error('Failed to update appointment:', updateError);
      throw updateError;
    }

    console.log(`Appointment ${appointmentId} ${action} by ${profile.full_name}`);

    // Send confirmation SMS to the client
    const clientMessage = isApproval 
      ? `Your wardrobe fitting appointment for ${new Date(appointment.appointment_date).toLocaleDateString()} at ${new Date(appointment.appointment_date).toLocaleTimeString()} has been APPROVED. Please arrive 5 minutes early. - Spelman Glee Club Wardrobe`
      : `Your wardrobe fitting appointment for ${new Date(appointment.appointment_date).toLocaleDateString()} has been DENIED. Please contact the wardrobe team for more information. - Spelman Glee Club Wardrobe`;

    // Look up client phone number
    const { data: clientProfile } = await supabase
      .from('gw_profiles')
      .select('phone_number')
      .eq('email', appointment.client_email)
      .single();

    if (clientProfile?.phone_number) {
      await supabase.functions.invoke('gw-send-sms', {
        body: {
          to: clientProfile.phone_number,
          message: clientMessage
        }
      });
      console.log('Confirmation SMS sent to client');
    }

    // Send confirmation back to approver
    const approverMessage = `✅ Fitting appointment ${action} for ${appointment.client_name} on ${new Date(appointment.appointment_date).toLocaleDateString()}`;
    
    await supabase.functions.invoke('gw-send-sms', {
      body: {
        to: smsData.From,
        message: approverMessage
      }
    });

    // Log the approval action
    await supabase
      .from('gw_notification_delivery_log')
      .insert({
        notification_id: appointmentId,
        user_email: profile.email,
        delivery_method: 'sms',
        status: 'delivered',
        notes: `Appointment ${action} via SMS`
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        action: action,
        appointmentId: appointmentId,
        approvedBy: profile.full_name
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error in handle-fitting-approval-sms:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);