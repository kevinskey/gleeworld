import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendSMSRequest {
  to: string;
  message: string;
  from?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, message, from }: SendSMSRequest = await req.json();
    
    console.log("GleeWorld SMS Request:", {
      to: to.substring(0, 6) + "***", // Mask phone number in logs
      message_length: message.length,
      from
    });

    // Check if Twilio credentials are available
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhone = Deno.env.get('TWILIO_PHONE_NUMBER') || from;

    if (!accountSid || !authToken || !twilioPhone) {
      console.error("Missing Twilio credentials");
      return new Response(JSON.stringify({
        success: false,
        error: "SMS service not configured. Missing Twilio credentials."
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Validate phone number format
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(to)) {
      return new Response(JSON.stringify({
        success: false,
        error: "Invalid phone number format"
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Prepare Twilio API request
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const credentials = btoa(`${accountSid}:${authToken}`);

    const formData = new URLSearchParams();
    formData.append('To', to);
    formData.append('From', twilioPhone);
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
      console.error("Twilio API error:", responseData);
      return new Response(JSON.stringify({
        success: false,
        error: responseData.message || "Failed to send SMS",
        code: responseData.code
      }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    console.log("SMS sent successfully:", {
      sid: responseData.sid,
      status: responseData.status
    });

    return new Response(JSON.stringify({
      success: true,
      sid: responseData.sid,
      status: responseData.status,
      message: "SMS sent successfully"
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error('Error in gw-send-sms function:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Failed to send SMS'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

serve(handler);