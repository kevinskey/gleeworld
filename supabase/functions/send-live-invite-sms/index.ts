import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface LiveInviteRequest {
  invited_user_id: string;
  host_name: string;
}

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

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
  const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
  const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.error("Missing Twilio configuration");
    return new Response(JSON.stringify({ error: "Missing Twilio configuration" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  try {
    const { invited_user_id, host_name }: LiveInviteRequest = await req.json();

    console.log("Live invite SMS request:", { invited_user_id, host_name });

    // Create Supabase client to fetch user's phone number
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Get invited user's profile with phone number
    const { data: profile, error: profileError } = await supabase
      .from('gw_profiles')
      .select('phone_number, full_name, first_name')
      .eq('user_id', invited_user_id)
      .single();

    if (profileError || !profile) {
      console.error("Failed to fetch profile:", profileError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: "User profile not found" 
      }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (!profile.phone_number) {
      console.log("User has no phone number:", invited_user_id);
      return new Response(JSON.stringify({ 
        success: false, 
        error: "User has no phone number",
        skipped: true
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const formattedPhone = formatPhoneNumber(profile.phone_number);
    const recipientName = profile.first_name || profile.full_name || 'there';
    
    const message = `Hey ${recipientName}! 📹 ${host_name} is inviting you to join a live video session on GleeWorld. Open the app to join now! https://gleeworld.org/glee-lounge`;

    console.log("Sending SMS to:", formattedPhone.substring(0, 6) + "***");

    // Send SMS via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const credentials = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

    const formData = new URLSearchParams();
    formData.append('To', formattedPhone);
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
      console.error("Twilio API error:", responseData);
      return new Response(JSON.stringify({
        success: false,
        error: responseData.message || "Failed to send SMS"
      }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log("Live invite SMS sent successfully:", {
      sid: responseData.sid,
      status: responseData.status,
      to: formattedPhone.substring(0, 6) + "***"
    });

    return new Response(JSON.stringify({
      success: true,
      sid: responseData.sid,
      message: "SMS sent successfully"
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error('Error in send-live-invite-sms:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Failed to send SMS'
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
};

serve(handler);
