import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const resendApiKey = Deno.env.get('RESEND_API_KEY');

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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { eventId, eventTitle, eventDate, userIds, message }: NotificationRequest = await req.json();

    console.log('Sending notifications for event:', { eventId, eventTitle, userIds });

    // Get user details
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', userIds);

    if (usersError) {
      console.error('Error fetching users:', usersError);
      throw usersError;
    }

    const notifications = [];
    const emailPromises = [];
    const smsPromises = [];

    // Get user phone numbers for SMS
    const { data: userProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, phone_number')
      .in('id', userIds);

    if (profilesError) {
      console.error('Error fetching user profiles:', profilesError);
    }

    const phoneMap = new Map(userProfiles?.map(p => [p.id, p.phone_number]) || []);

    // Create database notifications for each user
    for (const user of users) {
      // Insert notification record
      const { data: notification, error: notificationError } = await supabase
        .from('gw_notifications')
        .insert({
          user_id: user.id,
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

      // Send SMS notification if user has phone number
      const userPhone = phoneMap.get(user.id);
      if (userPhone) {
        const smsMessage = `Event Invitation: ${eventTitle} on ${new Date(eventDate).toLocaleDateString()}. ${message || 'Check GleeWorld for details.'}`;
        
        const smsPromise = supabase.functions.invoke('gw-send-sms', {
          body: {
            to: userPhone,
            message: smsMessage
          }
        }).catch((smsError) => {
          console.error('Error sending SMS to', userPhone, ':', smsError);
          return null;
        });

        smsPromises.push(smsPromise);
      }
    }

    // Wait for all emails and SMS to be sent
    const [emailResults, smsResults] = await Promise.allSettled([
      Promise.allSettled(emailPromises),
      Promise.allSettled(smsPromises)
    ]);
    
    const successfulEmails = emailResults.status === 'fulfilled' ? 
      emailResults.value.filter(result => result.status === 'fulfilled' && result.value !== null).length : 0;
    const successfulSMS = smsResults.status === 'fulfilled' ? 
      smsResults.value.filter(result => result.status === 'fulfilled' && result.value !== null).length : 0;

    console.log(`Notifications created: ${notifications.length}, Emails sent: ${successfulEmails}, SMS sent: ${successfulSMS}`);

    return new Response(JSON.stringify({
      success: true,
      notificationsCreated: notifications.length,
      emailsSent: successfulEmails,
      smsSent: successfulSMS,
      message: `Successfully notified ${notifications.length} users${successfulEmails > 0 ? `, sent ${successfulEmails} emails` : ''}${successfulSMS > 0 ? `, sent ${successfulSMS} SMS` : ''}`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in send-event-notifications function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});