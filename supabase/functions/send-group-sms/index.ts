import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, cache-control, pragma",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface GroupSMSRequest {
  conversationId: string;
  message: string;
  senderUserId: string;
  senderName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: "Method not allowed. Use POST." }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
  const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Missing Supabase env vars" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    return new Response(JSON.stringify({ error: "Missing Twilio credentials" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  try {
    const { conversationId, message, senderUserId, senderName }: GroupSMSRequest = await req.json();
    
    console.log('Processing group SMS:', { conversationId, senderUserId, senderName });

    // Validate required fields
    if (!conversationId) {
      console.error('Missing conversationId in request body');
      throw new Error('Missing conversationId');
    }
    
    if (!message) {
      throw new Error('Missing message');
    }

    if (!senderUserId) {
      throw new Error('Missing senderUserId');
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get conversation details including group info and Twilio number
    const isUuid = (value: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

    let conversation: any = null;
    let convError: any = null;

    if (isUuid(conversationId)) {
      const { data, error } = await supabase
        .from('gw_sms_conversations')
        .select(`
          *,
          gw_message_groups!inner(id, name)
        `)
        .eq('id', conversationId)
        .single();
      conversation = data;
      convError = error;
    } else {
      // Fallback: treat conversationId as group_id (e.g. "all-members")
      const { data, error } = await supabase
        .from('gw_sms_conversations')
        .select(`
          *,
          gw_message_groups!inner(id, name)
        `)
        .eq('group_id', conversationId)
        .eq('is_active', true)
        .single();
      conversation = data;
      convError = error;
    }
    if (convError || !conversation) {
      console.error('Conversation query error:', convError);
      throw new Error(`Conversation not found for ID: ${conversationId}`);
    }

    // Get sender's phone number
    const { data: senderProfile, error: senderError } = await supabase
      .from('gw_profiles')
      .select('phone_number')
      .eq('user_id', senderUserId)
      .single();

    if (senderError || !senderProfile?.phone_number) {
      throw new Error('Sender phone number not found');
    }

    // Get all group members' phone numbers except sender
    const { data: members, error: membersError } = await supabase
      .from('gw_group_members')
      .select(`
        gw_profiles!inner(phone_number, user_id)
      `)
      .eq('group_id', conversation.gw_message_groups.id)
      .neq('gw_profiles.user_id', senderUserId)
      .not('gw_profiles.phone_number', 'is', null);

    if (membersError) {
      console.error('Error fetching group members:', membersError);
      throw new Error('Failed to get group members');
    }

    const targetPhoneNumbers = members
      .map(member => member.gw_profiles?.phone_number)
      .filter(phone => phone) as string[];

    if (targetPhoneNumbers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No other members to notify' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Format message for group SMS: "[Group Name] FirstName: message"
    const groupName = conversation.gw_message_groups.name;
    const firstName = senderName.split(' ')[0];
    const smsText = `${groupName}: ${firstName}: ${message}`;
    const truncatedMessage = smsText.length > 160 ? smsText.substring(0, 157) + '...' : smsText;

    // Store the outbound message in database
    const { data: storedMessage, error: storeError } = await supabase
      .from('gw_sms_messages')
      .insert({
        conversation_id: conversation.id,
        sender_phone: senderProfile.phone_number,
        sender_user_id: senderUserId,
        message_body: message,
        direction: 'outbound',
        status: 'sending'
      })
      .select()
      .single();

    if (storeError) {
      console.error('Error storing message:', storeError);
      throw new Error('Failed to store message');
    }

    // Send SMS to all group members via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const credentials = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

    const results = await Promise.allSettled(
      targetPhoneNumbers.map(async (phoneNumber) => {
        const formData = new URLSearchParams();
        formData.append('From', conversation.twilio_phone_number);
        formData.append('To', phoneNumber);
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
          const errorText = await response.text();
          console.error(`SMS send failed for ${phoneNumber}:`, errorText);
          throw new Error(`Failed to send to ${phoneNumber}`);
        }

        const result = await response.json();
        console.log(`SMS sent to ${phoneNumber}:`, result.sid);
        return { phoneNumber, success: true, messageSid: result.sid };
      })
    );

    const successful = results.filter(result => result.status === 'fulfilled').length;
    const failed = results.filter(result => result.status === 'rejected').length;

    // Update message status based on results
    const finalStatus = failed === 0 ? 'delivered' : successful > 0 ? 'partial' : 'failed';
    
    await supabase
      .from('gw_sms_messages')
      .update({ 
        status: finalStatus,
        twilio_message_sid: successful > 0 ? 'group_message' : null
      })
      .eq('id', storedMessage.id);

    console.log(`Group SMS sent: ${successful} successful, ${failed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        messageId: storedMessage.id,
        totalSent: successful,
        totalFailed: failed,
        results: results.map(result => 
          result.status === 'fulfilled' 
            ? result.value 
            : { error: result.reason.message }
        )
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );

  } catch (error: any) {
    console.error('Error in send-group-sms function:', error);
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