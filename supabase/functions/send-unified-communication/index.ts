import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CommunicationRequest {
  communicationId: string;
  title: string;
  content: string;
  senderName: string;
  recipients: Array<{
    id: string;
    type: 'individual' | 'group' | 'role' | 'all_members';
    identifier: string;
    email?: string;
    phone?: string;
    name?: string;
  }>;
  channels: Array<'email' | 'sms' | 'in_app'>;
  scheduledFor?: string;
}


const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      communicationId,
      title,
      content,
      senderName,
      recipients,
      channels,
      scheduledFor
    }: CommunicationRequest = await req.json();

    console.log('Processing communication:', { communicationId, title, recipients: recipients.length, channels });

    // Initialize clients
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

    // Get Twilio credentials
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

    const results = {
      totalRecipients: recipients.length,
      emailsSent: 0,
      smsSent: 0,
      inAppCreated: 0,
      errors: [] as string[]
    };

    // Process each recipient
    for (const recipient of recipients) {
      console.log('Processing recipient:', recipient.id, recipient.type);

      // Insert recipient record
      const { data: recipientRecord, error: recipientError } = await supabase
        .from('gw_communication_recipients')
        .insert({
          communication_id: communicationId,
          recipient_type: recipient.type,
          recipient_identifier: recipient.identifier,
          recipient_email: recipient.email,
          recipient_phone: recipient.phone,
          recipient_name: recipient.name
        })
        .select()
        .single();

      if (recipientError) {
        console.error('Error creating recipient record:', recipientError);
        results.errors.push(`Failed to create recipient record for ${recipient.name || recipient.identifier}`);
        continue;
      }

      // Send via each requested channel
      for (const channel of channels) {
        const deliveryRecord = {
          communication_id: communicationId,
          recipient_id: recipientRecord.id,
          delivery_method: channel,
          status: 'pending' as const
        };

        try {
          if (channel === 'email' && recipient.email) {
            // Send email via Resend
            const emailResult = await resend.emails.send({
              from: 'Spelman Glee Club <notifications@gleeworld.org>',
              to: [recipient.email],
              subject: title,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <div style="background: linear-gradient(135deg, #8B5CF6, #3B82F6); padding: 20px; text-align: center;">
                    <h1 style="color: white; margin: 0;">Spelman College Glee Club</h1>
                  </div>
                  <div style="padding: 20px; background: white;">
                    <h2 style="color: #374151; margin-top: 0;">${title}</h2>
                    <div style="color: #6B7280; margin-bottom: 20px;">From: ${senderName}</div>
                    <div style="line-height: 1.6; color: #374151;">
                      ${content.replace(/\n/g, '<br>')}
                    </div>
                  </div>
                  <div style="background: #F9FAFB; padding: 15px; text-align: center; color: #6B7280; font-size: 14px;">
                    <p>You received this message as a member of the Spelman College Glee Club.</p>
                    <p>Visit <a href="https://gleeworld.org" style="color: #3B82F6;">GleeWorld.org</a> to manage your notification preferences.</p>
                  </div>
                </div>
              `
            });

            await supabase
              .from('gw_communication_delivery')
              .insert({
                ...deliveryRecord,
                status: 'delivered',
                external_id: emailResult.data?.id,
                delivered_at: new Date().toISOString(),
                metadata: { resend_response: emailResult }
              });

            results.emailsSent++;
            console.log('Email sent successfully to:', recipient.email);

          } else if (channel === 'sms' && recipient.phone && twilioAccountSid && twilioAuthToken && twilioPhoneNumber) {
            // Send SMS via Twilio
            const smsMessage = `${title}\n\nFrom: ${senderName}\n\n${content}\n\n--\nSpelman Glee Club\ngleeworld.org`;
            
            const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
            const credentials = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

            const smsResponse = await fetch(twilioUrl, {
              method: 'POST',
              headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: new URLSearchParams({
                From: twilioPhoneNumber,
                To: recipient.phone,
                Body: smsMessage,
              }),
            });

            const smsResult = await smsResponse.json();

            if (smsResponse.ok) {
              await supabase
                .from('gw_communication_delivery')
                .insert({
                  ...deliveryRecord,
                  status: 'delivered',
                  external_id: smsResult.sid,
                  delivered_at: new Date().toISOString(),
                  metadata: { twilio_response: smsResult }
                });

              results.smsSent++;
              console.log('SMS sent successfully to:', recipient.phone);
            } else {
              throw new Error(`Twilio error: ${smsResult.message || 'Unknown error'}`);
            }

          } else if (channel === 'in_app' && recipient.identifier) {
            // Create in-app notification
            const { error: notificationError } = await supabase
              .from('gw_notifications')
              .insert({
                user_id: recipient.identifier,
                title: title,
                message: content,
                type: 'message',
                category: 'communication',
                metadata: {
                  communication_id: communicationId,
                  sender_name: senderName
                }
              });

            if (notificationError) {
              throw new Error(`Failed to create in-app notification: ${notificationError.message}`);
            }

            await supabase
              .from('gw_communication_delivery')
              .insert({
                ...deliveryRecord,
                status: 'delivered',
                delivered_at: new Date().toISOString()
              });

            results.inAppCreated++;
            console.log('In-app notification created for:', recipient.name || recipient.identifier);
          }

        } catch (error) {
          console.error(`Error sending ${channel} to ${recipient.name || recipient.identifier}:`, error);
          
          await supabase
            .from('gw_communication_delivery')
            .insert({
              ...deliveryRecord,
              status: 'failed',
              error_message: error.message
            });

          results.errors.push(`Failed to send ${channel} to ${recipient.name || recipient.identifier}: ${error.message}`);
        }
      }
    }

    // Update communication status
    await supabase
      .from('gw_communication_system')
      .update({
        status: 'sent',
        metadata: {
          delivery_summary: results,
          sent_at: new Date().toISOString()
        }
      })
      .eq('id', communicationId);

    console.log('Communication processing completed:', results);

    return new Response(JSON.stringify({
      success: true,
      results
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error('Error in send-unified-communication function:', error);
    
    return new Response(JSON.stringify({
      error: error.message || 'Failed to send communication'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }
};

serve(handler);