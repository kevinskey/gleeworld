import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0?target=deno";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const resendApiKey = Deno.env.get('RESEND_API_KEY');

// Twilio credentials
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  userIds: string[];
  message?: string;
}

// Format phone number to E.164 format
const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  }
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }
  if (phone.startsWith('+')) {
    return phone;
  }
  return `+1${cleaned}`;
};

// Send SMS directly via Twilio API
async function sendSMS(to: string, message: string): Promise<{ success: boolean; error?: string }> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.log('Twilio not configured, skipping SMS');
    return { success: false, error: 'Twilio not configured' };
  }

  try {
    const formattedTo = formatPhoneNumber(to);
    console.log('Sending SMS to:', formattedTo.substring(0, 6) + '***');

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const credentials = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

    const formData = new URLSearchParams();
    formData.append('To', formattedTo);
    formData.append('From', TWILIO_PHONE_NUMBER);
    formData.append('Body', message);

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('Twilio API error:', responseData);
      return { success: false, error: responseData.message || 'Failed to send SMS' };
    }

    console.log('SMS sent successfully:', { sid: responseData.sid, status: responseData.status });
    return { success: true };
  } catch (error: any) {
    console.error('Error sending SMS:', error);
    return { success: false, error: error.message };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { eventId, eventTitle, eventDate, userIds, message }: NotificationRequest = await req.json();

    console.log('Sending notifications for event:', { eventId, eventTitle, userIds });

    // Get user details from gw_profiles
    const { data: users, error: usersError } = await supabase
      .from('gw_profiles')
      .select('user_id, email, full_name, phone_number')
      .in('user_id', userIds);

    if (usersError) {
      console.error('Error fetching users:', usersError);
      throw usersError;
    }

    console.log('Found users:', users?.map(u => ({ 
      name: u.full_name, 
      hasPhone: !!u.phone_number,
      phone: u.phone_number ? u.phone_number.substring(0, 4) + '***' : 'none'
    })));

    const notifications = [];
    const emailPromises = [];
    const smsResults: { success: boolean; user: string }[] = [];

    // Create database notifications for each user
    for (const user of users || []) {
      // Insert notification record
      const { data: notification, error: notificationError } = await supabase
        .from('gw_notifications')
        .insert({
          user_id: user.user_id,
          title: `Event Invitation: ${eventTitle}`,
          message: message || `You've been invited to ${eventTitle}`,
          type: 'info',
          category: 'event',
          metadata: { event_id: eventId }
        })
        .select()
        .single();

      if (notificationError) {
        console.error('Error creating notification:', notificationError);
      } else {
        notifications.push(notification);
      }

      // Send email notification if Resend is configured and user has email
      if (resend && user.email) {
        const emailPromise = resend.emails.send({
          from: "Glee World <onboarding@resend.dev>",
          to: [user.email],
          subject: `Invitation: ${eventTitle}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">You're Invited to ${eventTitle}</h2>
              <p>Hello ${user.full_name || user.email},</p>
              <p>You've been invited to attend <strong>${eventTitle}</strong> scheduled for ${new Date(eventDate).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}.</p>
              ${message ? `<p><strong>Additional Message:</strong> ${message}</p>` : ''}
              <p>Please check the Glee World calendar for more details and to confirm your attendance.</p>
              <p>Best regards,<br>The Glee World Team</p>
            </div>
          `,
        }).catch((emailError) => {
          console.error('Error sending email to', user.email, ':', emailError);
          return null;
        });

        emailPromises.push(emailPromise);
      }

      // Send SMS notification directly if user has phone number
      if (user.phone_number) {
        const smsMessage = `Event Invitation: ${eventTitle} on ${new Date(eventDate).toLocaleDateString()}. ${message || 'Check GleeWorld for details.'}`;
        const result = await sendSMS(user.phone_number, smsMessage);
        smsResults.push({ success: result.success, user: user.full_name || user.email || 'Unknown' });
      } else {
        console.log(`No phone number for user ${user.full_name || user.email}`);
      }
    }

    // Wait for all emails to be sent
    const emailResults = await Promise.allSettled(emailPromises);
    
    const successfulEmails = emailResults.filter(result => result.status === 'fulfilled' && result.value !== null).length;
    const successfulSMS = smsResults.filter(r => r.success).length;

    console.log(`Notifications created: ${notifications.length}, Emails sent: ${successfulEmails}, SMS sent: ${successfulSMS}/${smsResults.length}`);

    return new Response(JSON.stringify({
      success: true,
      notificationsCreated: notifications.length,
      emailsSent: successfulEmails,
      smsSent: successfulSMS,
      smsAttempted: smsResults.length,
      message: `Successfully notified ${notifications.length} users${successfulEmails > 0 ? `, sent ${successfulEmails} emails` : ''}${successfulSMS > 0 ? `, sent ${successfulSMS} SMS` : ''}`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in send-event-notifications function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});