import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: "Method not allowed. Use POST." }), {
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

    // Get conversation details - conversationId is actually the group_id
    const { data: conversation, error: convError } = await supabase
      .from('gw_sms_conversations')
      .select(`
        *,
        gw_message_groups!inner(id, name)
      `)
      .eq('group_id', conversationId)
      .eq('is_active', true)
      .single();

    if (convError || !conversation) {
      console.error('Conversation query error:', convError);
      return new Response(
        JSON.stringify({ 
          error: 'SMS not enabled',
          message: `No active SMS conversation found. Please enable SMS for this group first using the SMS interface.`,
          conversationId
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
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
    // If "All Members" group, fetch ALL users with member role, not just group members
    const groupName = conversation.gw_message_groups.name;
    const isAllMembersGroup = groupName.toLowerCase().includes('all members');
    
    let targetPhoneNumbers: string[] = [];
    
    if (isAllMembersGroup) {
      // Fetch ALL users with phone numbers (regardless of role)
      const { data: allUsers, error: allUsersError } = await supabase
        .from('gw_profiles')
        .select('phone_number, user_id, role')
        .neq('user_id', senderUserId)
        .not('phone_number', 'is', null)
        .neq('phone_number', '');
      
      if (allUsersError) {
        console.error('Error fetching all users:', allUsersError);
        throw new Error('Failed to get all users');
      }
      
      console.log(`All Members group: Found ${allUsers?.length || 0} users with phone numbers (all roles)`);
      
      targetPhoneNumbers = (allUsers || [])
        .map(profile => profile.phone_number)
        .filter(phone => phone)
        .map(phone => formatPhoneNumber(phone as string));
    } else {
      // Regular group - fetch only explicit group members
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

      targetPhoneNumbers = members
        .map(member => member.gw_profiles?.phone_number)
        .filter(phone => phone)
        .map(phone => formatPhoneNumber(phone as string));
    }

    if (targetPhoneNumbers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No other members to notify' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Format message for group SMS: "[Group Name] FirstName: message"
    const firstName = senderName.split(' ')[0];
    const smsText = `${groupName}: ${firstName}: ${message}`;
    const truncatedMessage = smsText.length > 160 ? smsText.substring(0, 157) + '...' : smsText;

    // Store the outbound message in database
    const { data: storedMessage, error: storeError } = await supabase
      .from('gw_sms_messages')
      .insert({
        conversation_id: conversation.id,
        sender_phone: formatPhoneNumber(senderProfile.phone_number),
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
        formData.append('From', TWILIO_PHONE_NUMBER);
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