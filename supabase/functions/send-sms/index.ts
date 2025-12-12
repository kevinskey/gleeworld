import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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
  notificationId?: string;
}

// Format phone number to E.164 format (adds +1 for US numbers if missing)
const formatPhoneNumber = (phone: string): string => {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // If already has country code (11 digits starting with 1), add +
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  }
  
  // If 10 digits (US number without country code), add +1
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }
  
  // If already has +, return as is
  if (phone.startsWith('+')) {
    return phone;
  }
  
  // Default: assume US and add +1
  return `+1${cleaned}`;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: SMSPayload = await req.json();
    
    // Format phone number to E.164 format
    const formattedTo = formatPhoneNumber(payload.to);
    
    console.log('Processing SMS request:', { ...payload, to: formattedTo });

    // TODO: Implement SMS sending via Twilio
    // For now, we'll just log the attempt and update the delivery status
    
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioFromNumber = Deno.env.get('TWILIO_PHONE_NUMBER') || Deno.env.get('TWILIO_FROM_NUMBER');

    if (!twilioAccountSid || !twilioAuthToken || !twilioFromNumber) {
      console.log('Twilio credentials not configured, SMS not sent');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'SMS service not configured' 
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Create Twilio client and send SMS
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: formattedTo,
          From: twilioFromNumber,
          Body: payload.message,
        }),
      }
    );

    const result = await response.json();

    if (response.ok) {
      console.log('SMS sent successfully:', result);
      
      // Update delivery log if notificationId provided
      if (payload.notificationId) {
        await supabase
          .from('gw_notification_delivery_log')
          .update({
            status: 'delivered',
            delivered_at: new Date().toISOString(),
            external_id: result.sid
          })
          .eq('notification_id', payload.notificationId)
          .eq('delivery_method', 'sms');
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          messageId: result.sid 
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    } else {
      console.error('SMS sending failed:', result);
      
      // Update delivery log with error
      if (payload.notificationId) {
        await supabase
          .from('gw_notification_delivery_log')
          .update({
            status: 'failed',
            error_message: result.message || 'SMS delivery failed'
          })
          .eq('notification_id', payload.notificationId)
          .eq('delivery_method', 'sms');
      }

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: result.message || 'SMS delivery failed' 
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }
  } catch (error: any) {
    console.error('Error in SMS handler:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);