import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  appointmentId: string;
  phoneNumber: string;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { appointmentId, phoneNumber, message }: NotificationRequest = await req.json();

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get Twilio credentials
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!accountSid || !authToken || !fromNumber) {
      throw new Error('Twilio credentials not configured');
    }

    // Send SMS using Twilio API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const credentials = btoa(`${accountSid}:${authToken}`);

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: fromNumber,
        To: phoneNumber,
        Body: message,
      }),
    });

    const twilioResult = await response.json();

    if (!response.ok) {
      throw new Error(`Twilio error: ${twilioResult.message || 'Unknown error'}`);
    }

    // Log the notification delivery
    await supabase
      .from('gw_notification_delivery_log')
      .insert({
        notification_id: appointmentId,
        user_id: null, // This is for appointment notifications, not user-specific
        delivery_method: 'sms',
        status: 'delivered',
        sent_at: new Date().toISOString(),
        external_id: twilioResult.sid,
        metadata: {
          phone_number: phoneNumber,
          twilio_response: twilioResult
        }
      });

    console.log('SMS sent successfully:', twilioResult);

    return new Response(JSON.stringify({ 
      success: true, 
      messageId: twilioResult.sid 
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error('Error sending appointment notification:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to send notification' 
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