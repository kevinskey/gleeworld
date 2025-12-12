import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, cache-control, pragma",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface BroadcastSMSRequest {
  message: string;
  senderUserId: string;
  senderName: string;
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

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
  const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
  const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Missing Supabase env vars" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    return new Response(JSON.stringify({ error: "Missing Twilio credentials" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  try {
    const { message, senderUserId, senderName }: BroadcastSMSRequest = await req.json();
    
    console.log('Processing broadcast SMS:', { senderUserId, senderName, messageLength: message.length });

    if (!message) {
      throw new Error('Missing message');
    }
    if (!senderUserId) {
      throw new Error('Missing senderUserId');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get ALL members with phone numbers (excluding sender)
    const { data: members, error: membersError } = await supabase
      .from('gw_profiles')
      .select('user_id, phone_number, full_name')
      .not('phone_number', 'is', null)
      .neq('phone_number', '')
      .neq('user_id', senderUserId);

    if (membersError) {
      console.error('Error fetching members:', membersError);
      throw new Error('Failed to get members');
    }

    // Filter and format phone numbers
    const targetMembers = members
      .filter(m => m.phone_number && m.phone_number.trim() !== '')
      .map(m => ({
        userId: m.user_id,
        phoneNumber: formatPhoneNumber(m.phone_number),
        name: m.full_name
      }));

    console.log(`Found ${targetMembers.length} members with phone numbers`);

    if (targetMembers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No members with phone numbers to notify', totalSent: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Format message
    const firstName = senderName.split(' ')[0];
    const smsText = `GleeWorld: ${firstName}: ${message}`;
    const truncatedMessage = smsText.length > 160 ? smsText.substring(0, 157) + '...' : smsText;

    // Send SMS to all members via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const credentials = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

    // Process in batches of 10 to avoid rate limits
    const batchSize = 10;
    let successful = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < targetMembers.length; i += batchSize) {
      const batch = targetMembers.slice(i, i + batchSize);
      
      const results = await Promise.allSettled(
        batch.map(async (member) => {
          const formData = new URLSearchParams();
          formData.append('From', TWILIO_PHONE_NUMBER);
          formData.append('To', member.phoneNumber);
          formData.append('Body', truncatedMessage);

          const response = await fetch(twilioUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${credentials}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData,
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.error(`SMS failed for ${member.phoneNumber}:`, errorData);
            throw new Error(`Failed: ${errorData.message || response.status}`);
          }

          const result = await response.json();
          console.log(`SMS sent to ${member.phoneNumber}: ${result.sid}`);
          return { phoneNumber: member.phoneNumber, success: true, sid: result.sid };
        })
      );

      results.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          successful++;
        } else {
          failed++;
          errors.push(`${batch[idx].phoneNumber}: ${result.reason.message}`);
        }
      });

      // Small delay between batches to respect rate limits
      if (i + batchSize < targetMembers.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`Broadcast SMS complete: ${successful} successful, ${failed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        totalMembers: targetMembers.length,
        totalSent: successful,
        totalFailed: failed,
        errors: errors.slice(0, 10) // Return first 10 errors
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );

  } catch (error: any) {
    console.error('Error in broadcast-sms function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
  }
};

serve(handler);
