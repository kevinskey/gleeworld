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
  to?: string;
  message: string;
  notificationId?: string;
  // Bulk SMS fields
  sendToAll?: boolean;
  recipients?: string[];
}

// Format phone number to E.164 format (adds +1 for US numbers if missing)
const formatPhoneNumber = (phone: string): string => {
  if (!phone) return '';
  
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

// Send a single SMS via Twilio
const sendSingleSMS = async (
  to: string,
  message: string,
  twilioAccountSid: string,
  twilioAuthToken: string,
  twilioFromNumber: string
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  const formattedTo = formatPhoneNumber(to);
  if (!formattedTo) {
    return { success: false, error: 'Invalid phone number' };
  }

  try {
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
          Body: message,
        }),
      }
    );

    const result = await response.json();
    
    if (response.ok) {
      console.log(`SMS sent to ${formattedTo}:`, result.sid);
      return { success: true, messageId: result.sid };
    } else {
      console.error(`SMS failed for ${formattedTo}:`, result.message);
      return { success: false, error: result.message || 'SMS delivery failed' };
    }
  } catch (error: any) {
    console.error(`SMS error for ${formattedTo}:`, error.message);
    return { success: false, error: error.message };
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: SMSPayload = await req.json();
    console.log('SMS request received:', { 
      sendToAll: payload.sendToAll, 
      recipientCount: payload.recipients?.length || (payload.to ? 1 : 0),
      messageLength: payload.message?.length 
    });

    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioFromNumber = Deno.env.get('TWILIO_PHONE_NUMBER') || Deno.env.get('TWILIO_FROM_NUMBER');

    if (!twilioAccountSid || !twilioAuthToken || !twilioFromNumber) {
      console.log('Twilio credentials not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'SMS service not configured' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (!payload.message?.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: 'Message is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Handle bulk SMS (sendToAll or recipients array)
    if (payload.sendToAll || (payload.recipients && payload.recipients.length > 0)) {
      let phoneNumbers: string[] = [];

      if (payload.sendToAll) {
        // Fetch all members with phone numbers
        const { data: members, error } = await supabase
          .from('gw_profiles')
          .select('phone_number')
          .not('phone_number', 'is', null)
          .neq('phone_number', '');

        if (error) {
          console.error('Error fetching members:', error);
          return new Response(
            JSON.stringify({ success: false, error: 'Failed to fetch member list' }),
            { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        phoneNumbers = (members || [])
          .map(m => m.phone_number)
          .filter((p): p is string => !!p);
      } else {
        phoneNumbers = payload.recipients || [];
      }

      if (phoneNumbers.length === 0) {
        return new Response(
          JSON.stringify({ success: false, error: 'No valid recipients found' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      console.log(`Sending bulk SMS to ${phoneNumbers.length} recipients`);

      // Send SMS to each recipient
      const results = await Promise.all(
        phoneNumbers.map(phone => 
          sendSingleSMS(phone, payload.message, twilioAccountSid, twilioAuthToken, twilioFromNumber)
        )
      );

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      console.log(`Bulk SMS complete: ${successful} sent, ${failed} failed`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          sent: successful, 
          failed: failed,
          total: phoneNumbers.length
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Handle single SMS (legacy support)
    if (payload.to) {
      const result = await sendSingleSMS(
        payload.to, 
        payload.message, 
        twilioAccountSid, 
        twilioAuthToken, 
        twilioFromNumber
      );

      if (result.success && payload.notificationId) {
        await supabase
          .from('gw_notification_delivery_log')
          .update({
            status: 'delivered',
            delivered_at: new Date().toISOString(),
            external_id: result.messageId
          })
          .eq('notification_id', payload.notificationId)
          .eq('delivery_method', 'sms');
      }

      return new Response(
        JSON.stringify(result),
        { 
          status: result.success ? 200 : 400, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'No recipient specified' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error: any) {
    console.error('Error in SMS handler:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
};

serve(handler);
