import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SMSWebhookPayload {
  From: string;
  Body: string;
  MessageSid: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const contentType = req.headers.get("content-type") || "";
    let body: string;
    let smsData: SMSWebhookPayload;

    if (contentType.includes("application/x-www-form-urlencoded")) {
      // Twilio webhook format
      const formData = await req.formData();
      smsData = {
        From: formData.get("From") as string,
        Body: formData.get("Body") as string,
        MessageSid: formData.get("MessageSid") as string,
      };
    } else {
      // JSON format
      const jsonData = await req.json();
      smsData = jsonData;
    }

    console.log("SMS webhook received:", smsData);

    const { From: phoneNumber, Body: messageBody } = smsData;
    
    // Parse the SMS message for approval commands
    // Expected formats: "APPROVE {appointment_id}" or "DENY {appointment_id}"
    const approvalRegex = /^(APPROVE|DENY)\s+([a-f0-9-]{36})$/i;
    const match = messageBody.trim().match(approvalRegex);

    if (!match) {
      console.log("SMS message does not match approval format:", messageBody);
      return new Response(JSON.stringify({ 
        success: false, 
        message: "Invalid command format. Use 'APPROVE {id}' or 'DENY {id}'" 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const [, action, appointmentId] = match;
    console.log(`Processing ${action} for appointment ${appointmentId} from ${phoneNumber}`);

    // Verify the phone number is authorized (470-622-1392)
    const authorizedNumber = "+14706221392"; // Normalized format
    const normalizedFrom = phoneNumber.replace(/\D/g, ''); // Remove non-digits
    const normalizedAuth = authorizedNumber.replace(/\D/g, '');

    if (!normalizedFrom.endsWith(normalizedAuth.slice(-10))) { // Check last 10 digits
      console.log("Unauthorized phone number:", phoneNumber);
      return new Response(JSON.stringify({ 
        success: false, 
        message: "Unauthorized phone number" 
      }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get the appointment details
    const { data: appointment, error: fetchError } = await supabase
      .from('gw_appointments')
      .select('*')
      .eq('id', appointmentId)
      .eq('status', 'pending_approval')
      .single();

    if (fetchError || !appointment) {
      console.error("Appointment not found or not pending:", fetchError);
      return new Response(JSON.stringify({ 
        success: false, 
        message: "Appointment not found or not pending approval" 
      }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Update appointment status
    const newStatus = action.toUpperCase() === 'APPROVE' ? 'confirmed' : 'cancelled';
    
    const { error: updateError } = await supabase
      .from('gw_appointments')
      .update({ status: newStatus })
      .eq('id', appointmentId);

    if (updateError) {
      console.error("Error updating appointment:", updateError);
      throw updateError;
    }

    // Send notification to client
    const appointmentDateTime = new Date(appointment.appointment_date);
    const message = action.toUpperCase() === 'APPROVE' 
      ? `Great news! Your appointment for ${appointmentDateTime.toLocaleDateString()} at ${appointmentDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} has been APPROVED. Please arrive 5 minutes early. Payment will be collected in person.`
      : `Your appointment request for ${appointmentDateTime.toLocaleDateString()} has been declined. Please contact us to reschedule.`;

    // Send SMS to client
    try {
      await supabase.functions.invoke('gw-send-sms', {
        body: {
          to: appointment.client_phone,
          message
        }
      });
    } catch (smsError) {
      console.error('Failed to send SMS to client:', smsError);
    }

    // Send email to client
    try {
      await supabase.functions.invoke('gw-send-email', {
        body: {
          to: appointment.client_email,
          subject: `Appointment ${action.toUpperCase() === 'APPROVE' ? 'Confirmed' : 'Update'}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Appointment ${action.toUpperCase() === 'APPROVE' ? 'Confirmed' : 'Update'}</h2>
              <p>Dear ${appointment.client_name},</p>
              <p>${message}</p>
              ${action.toUpperCase() === 'APPROVE' ? `
                <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3>Appointment Details:</h3>
                  <p><strong>Date:</strong> ${appointmentDateTime.toLocaleDateString()}</p>
                  <p><strong>Time:</strong> ${appointmentDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  <p><strong>Duration:</strong> ${appointment.duration_minutes} minutes</p>
                  <p><strong>Type:</strong> ${appointment.title}</p>
                </div>
              ` : ''}
              <p>Best regards,<br>The Glee World Team</p>
            </div>
          `
        }
      });
    } catch (emailError) {
      console.error('Failed to send email to client:', emailError);
    }

    // Send confirmation SMS back to approver
    const confirmationMessage = `✅ Appointment ${appointmentId.slice(0, 8)} has been ${action.toUpperCase()}ED for ${appointment.client_name}. Client has been notified.`;
    
    try {
      await supabase.functions.invoke('gw-send-sms', {
        body: {
          to: phoneNumber,
          message: confirmationMessage
        }
      });
    } catch (confirmSmsError) {
      console.error('Failed to send confirmation SMS:', confirmSmsError);
    }

    // Log the action
    await supabase
      .from('gw_notification_delivery_log')
      .insert({
        appointment_id: appointmentId,
        notification_type: 'sms_approval',
        delivery_status: 'delivered',
        delivery_details: {
          action: action.toUpperCase(),
          approver_phone: phoneNumber,
          processed_at: new Date().toISOString()
        }
      });

    console.log(`Successfully processed ${action} for appointment ${appointmentId}`);

    return new Response(JSON.stringify({
      success: true,
      message: `Appointment ${action.toLowerCase()}ed successfully`,
      appointmentId,
      action: action.toUpperCase()
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in handle-sms-approval function:", error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || "Failed to process SMS approval",
      details: error.toString()
    }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json", 
        ...corsHeaders 
      },
    });
  }
};

serve(handler);