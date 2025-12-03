import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  requestId: string;
  userId: string;
  status: string;
  message?: string;
  adminNotes?: string;
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

    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

    const { requestId, userId, status, message, adminNotes }: NotificationRequest = await req.json();

    console.log('Processing notification for:', { requestId, userId, status });

    // Get user profile for email
    const { data: userProfile, error: userError } = await supabase
      .from('gw_profiles')
      .select('full_name, email')
      .eq('user_id', userId)
      .single();

    if (userError || !userProfile) {
      console.error('Error fetching user profile:', userError);
      // Fallback to profiles table
      const { data: fallbackProfile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', userId)
        .single();
      
      if (!fallbackProfile) {
        throw new Error('User profile not found');
      }
      userProfile.full_name = fallbackProfile.full_name;
      userProfile.email = fallbackProfile.email;
    }

    // Get excuse request details
    const { data: request, error: requestError } = await supabase
      .from('excuse_requests')
      .select('event_title, event_date, reason')
      .eq('id', requestId)
      .single();

    if (requestError || !request) {
      throw new Error('Excuse request not found');
    }

    let emailSubject = '';
    let emailBody = '';

    switch (status) {
      case 'forwarded':
        emailSubject = 'Excuse Request Forwarded for Review';
        emailBody = `
          <h2>Your excuse request has been forwarded for review</h2>
          <p>Dear ${userProfile.full_name || 'Student'},</p>
          <p>Your excuse request for <strong>${request.event_title}</strong> on ${new Date(request.event_date).toLocaleDateString()} has been forwarded to the director for final approval.</p>
          <p>You will receive another notification once a decision has been made.</p>
          <p>Best regards,<br>Spelman College Glee Club</p>
        `;
        break;

      case 'returned':
        emailSubject = 'Excuse Request Returned - Action Required';
        emailBody = `
          <h2>Your excuse request needs additional information</h2>
          <p>Dear ${userProfile.full_name || 'Student'},</p>
          <p>Your excuse request for <strong>${request.event_title}</strong> on ${new Date(request.event_date).toLocaleDateString()} has been returned with comments:</p>
          <div style="background-color: #f0f8ff; padding: 15px; border-left: 4px solid #0066cc; margin: 15px 0;">
            <p><strong>Secretary's Comments:</strong></p>
            <p>${message || 'Please provide additional information.'}</p>
          </div>
          <p>Please log in to the attendance system to view your request and provide any additional information needed.</p>
          <p>Best regards,<br>Spelman College Glee Club</p>
        `;
        break;

      case 'approved':
        emailSubject = 'Excuse Request Approved';
        emailBody = `
          <h2>Your excuse request has been approved</h2>
          <p>Dear ${userProfile.full_name || 'Student'},</p>
          <p>Your excuse request for <strong>${request.event_title}</strong> on ${new Date(request.event_date).toLocaleDateString()} has been approved by the director.</p>
          ${adminNotes ? `
          <div style="background-color: #f0f8f0; padding: 15px; border-left: 4px solid #00cc66; margin: 15px 0;">
            <p><strong>Director's Notes:</strong></p>
            <p>${adminNotes}</p>
          </div>
          ` : ''}
          <p>This excuse will be reflected in your attendance records.</p>
          <p>Best regards,<br>Spelman College Glee Club</p>
        `;
        break;

      case 'denied':
        emailSubject = 'Excuse Request Denied';
        emailBody = `
          <h2>Your excuse request has been denied</h2>
          <p>Dear ${userProfile.full_name || 'Student'},</p>
          <p>Unfortunately, your excuse request for <strong>${request.event_title}</strong> on ${new Date(request.event_date).toLocaleDateString()} has been denied.</p>
          ${adminNotes ? `
          <div style="background-color: #fff0f0; padding: 15px; border-left: 4px solid #cc0066; margin: 15px 0;">
            <p><strong>Director's Notes:</strong></p>
            <p>${adminNotes}</p>
          </div>
          ` : ''}
          <p>If you have questions about this decision, please contact the Glee Club administration.</p>
          <p>Best regards,<br>Spelman College Glee Club</p>
        `;
        break;

      default:
        throw new Error('Invalid status for notification');
    }

    // Send email notification
    const emailResponse = await resend.emails.send({
      from: "Spelman Glee Club <notifications@gleeworld.org>",
      to: [userProfile.email],
      subject: emailSubject,
      html: emailBody,
    });

    console.log('Email sent successfully:', emailResponse);

    // Create in-app notification
    await supabase.from('gw_notifications').insert({
      user_id: userId,
      title: emailSubject,
      message: status === 'returned' ? `Secretary Comments: ${message}` : 
               status === 'approved' ? `Your excuse request has been approved. ${adminNotes || ''}` :
               status === 'denied' ? `Your excuse request has been denied. ${adminNotes || ''}` :
               'Your excuse request has been forwarded for review.',
      type: status === 'approved' ? 'success' : 
            status === 'denied' ? 'error' : 
            status === 'returned' ? 'warning' : 'info',
      category: 'excuse_request',
      metadata: {
        request_id: requestId,
        event_title: request.event_title,
        event_date: request.event_date,
        status: status
      }
    });

    return new Response(
      JSON.stringify({ success: true, emailId: emailResponse.data?.id }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in send-excuse-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);