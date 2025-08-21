import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AppointmentNotificationRequest {
  appointmentId: string;
  type: 'confirmation' | 'update' | 'cancellation';
}

const handler = async (req: Request): Promise<Response> => {
  console.log('Send appointment notification function called');

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { appointmentId, type }: AppointmentNotificationRequest = await req.json();
    console.log('Processing appointment notification:', { appointmentId, type });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch appointment details
    const { data: appointment, error: appointmentError } = await supabase
      .from('gw_appointments')
      .select('*')
      .eq('id', appointmentId)
      .single();

    if (appointmentError || !appointment) {
      console.error('Error fetching appointment:', appointmentError);
      throw new Error('Appointment not found');
    }

    console.log('Appointment details:', appointment);

    // Format appointment date
    const appointmentDate = new Date(appointment.appointment_date);
    const formattedDate = appointmentDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const formattedTime = appointmentDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    // Prepare email content based on type
    let subject = '';
    let heading = '';
    let message = '';

    switch (type) {
      case 'confirmation':
        subject = 'Appointment Confirmation - Spelman College Glee Club';
        heading = 'Your Appointment is Confirmed!';
        message = `Thank you for booking an appointment with us. We look forward to meeting with you.`;
        break;
      case 'update':
        subject = 'Appointment Update - Spelman College Glee Club';
        heading = 'Your Appointment Has Been Updated';
        message = `Your appointment details have been updated. Please review the new information below.`;
        break;
      case 'cancellation':
        subject = 'Appointment Cancellation - Spelman College Glee Club';
        heading = 'Your Appointment Has Been Cancelled';
        message = `We regret to inform you that your appointment has been cancelled. Please contact us to reschedule.`;
        break;
    }

    // Send email notification
    const emailResponse = await resend.emails.send({
      from: "Spelman Glee Club <noreply@gleeworldorg.dev>",
      to: [appointment.client_email],
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1e40af; margin: 0;">Spelman College Glee Club</h1>
            <p style="color: #6b7280; margin: 5px 0;">"To Amaze and Inspire"</p>
          </div>
          
          <div style="background: #f8fafc; padding: 30px; border-radius: 12px; margin-bottom: 20px;">
            <h2 style="color: #1e293b; margin-top: 0;">${heading}</h2>
            <p style="color: #4b5563; line-height: 1.6;">${message}</p>
          </div>

          ${type !== 'cancellation' ? `
            <div style="background: #f0f9ff; padding: 25px; border-radius: 12px; margin-bottom: 20px; border-left: 4px solid #3b82f6;">
              <h3 style="color: #1e40af; margin-top: 0; margin-bottom: 15px;">Appointment Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #4b5563; font-weight: 600;">Date:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${formattedDate}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #4b5563; font-weight: 600;">Time:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${formattedTime}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #4b5563; font-weight: 600;">Type:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${appointment.appointment_type}</td>
                </tr>
                ${appointment.description ? `
                <tr>
                  <td style="padding: 8px 0; color: #4b5563; font-weight: 600;">Notes:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${appointment.description}</td>
                </tr>
                ` : ''}
              </table>
            </div>
          ` : ''}

          <div style="background: #fef7ff; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <p style="color: #7c3aed; margin: 0; font-size: 14px;">
              <strong>Questions or need to reschedule?</strong><br>
              Please contact us and we'll be happy to assist you.
            </p>
          </div>

          <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px; margin: 0;">
              Spelman College Glee Club<br>
              "To Amaze and Inspire"
            </p>
          </div>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Appointment notification sent successfully',
      emailResponse 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in send-appointment-notification function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Unknown error occurred' 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);