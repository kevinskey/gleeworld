import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SMSPayload {
  to: string;
  message: string;
  provider?: 'twilio' | 'messagebird';
}

interface SocialMediaPayload {
  platform: 'twitter' | 'facebook' | 'instagram' | 'linkedin';
  content: string;
  imageUrl?: string;
  scheduledAt?: string;
}

interface NotificationPayload {
  type: string;
  target: string;
  title: string;
  message: string;
  sender_id?: string;
  category?: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: any;
  priority?: number;
  sendEmail?: boolean;
  sendSms?: boolean;
  smsData?: SMSPayload;
  socialMedia?: SocialMediaPayload;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: NotificationPayload = await req.json();
    console.log('Processing notification:', payload);

    const results = {
      notification: null as any,
      email: null as any,
      sms: null as any,
      socialMedia: null as any
    };

    // Create the notification in the database
    const { data: notification, error: notificationError } = await supabase
      .from('gw_notifications')
      .insert({
        user_id: payload.target,
        title: payload.title,
        message: payload.message,
        type: payload.type || 'info',
        category: payload.category || 'general',
        action_url: payload.actionUrl || null,
        action_label: payload.actionLabel || null,
        metadata: payload.metadata || {},
        priority: payload.priority || 0,
        expires_at: null,
        sender_id: payload.sender_id || null
      })
      .select()
      .single();

    if (notificationError) {
      console.error('Error creating notification:', notificationError);
      throw notificationError;
    }

    results.notification = notification;

    // Send email if requested
    if (payload.sendEmail) {
      const { data: userProfile } = await supabase
        .from('gw_profiles')
        .select('email, full_name')
        .eq('user_id', payload.target)
        .single();

      if (userProfile?.email) {
        const emailResponse = await resend.emails.send({
          from: 'Spelman Glee Club <notifications@gleeworld.com>',
          to: [userProfile.email],
          subject: payload.title,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #8B2635, #6B1E29); padding: 20px; text-align: center;">
                <h1 style="color: white; margin: 0;">Spelman College Glee Club</h1>
              </div>
              
              <div style="padding: 30px; background: white;">
                <h2 style="color: #8B2635; margin-top: 0;">${payload.title}</h2>
                <p style="color: #333; line-height: 1.6; font-size: 16px;">${payload.message}</p>
                
                ${payload.actionUrl ? `
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${payload.actionUrl}" 
                       style="background: #8B2635; color: white; padding: 12px 30px; 
                              text-decoration: none; border-radius: 5px; display: inline-block;">
                      ${payload.actionLabel || 'View Details'}
                    </a>
                  </div>
                ` : ''}
                
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                  <p style="color: #666; font-size: 14px;">
                    This notification was sent automatically. Please do not reply to this email.
                  </p>
                </div>
              </div>
            </div>
          `,
        });

        results.email = emailResponse;
        console.log('Email sent successfully:', emailResponse);
      }
    }

    // Send SMS if requested (placeholder - would need SMS provider integration)
    if (payload.sendSms && payload.smsData) {
      console.log('SMS sending requested but not implemented yet:', payload.smsData);
      // TODO: Implement SMS sending via Twilio or similar service
      results.sms = { message: 'SMS functionality not implemented yet' };
    }

    // Post to social media if requested
    if (payload.socialMedia) {
      console.log('Social media posting requested:', payload.socialMedia);
      
      // Store the social media post for later processing
      const { data: socialPost, error: socialError } = await supabase
        .from('gw_social_media_posts')
        .insert({
          platform: payload.socialMedia.platform,
          content: payload.socialMedia.content,
          image_url: payload.socialMedia.imageUrl || null,
          scheduled_at: payload.socialMedia.scheduledAt || null,
          status: 'pending'
        })
        .select()
        .single();

      if (socialError) {
        console.error('Error creating social media post:', socialError);
      } else {
        results.socialMedia = socialPost;
      }
    }

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error('Error in notification handler:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);