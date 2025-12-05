import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TwilioSMSWebhook {
  From: string;
  To: string;
  Body: string;
  MessageSid: string;
  AccountSid: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    console.log('Received group SMS webhook from Twilio');

    // Parse Twilio webhook data
    const formData = await req.formData();
    const smsData: TwilioSMSWebhook = {
      From: formData.get('From') as string,
      To: formData.get('To') as string,
      Body: formData.get('Body') as string,
      MessageSid: formData.get('MessageSid') as string,
      AccountSid: formData.get('AccountSid') as string,
    };

    console.log('Incoming SMS data:', { 
      from: smsData.From, 
      to: smsData.To, 
      body: smsData.Body?.substring(0, 50) + '...' 
    });

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find the conversation this SMS belongs to
    const { data: conversation, error: convError } = await supabase
      .from('gw_sms_conversations')
      .select(`
        *,
        gw_message_groups!inner(id, name)
      `)
      .eq('twilio_phone_number', smsData.To)
      .eq('is_active', true)
      .single();

    if (convError || !conversation) {
      console.error('No active conversation found for number:', smsData.To);
      // Return TwiML response to acknowledge receipt
      return new Response(
        `<Response><Message>This group conversation is not active.</Message></Response>`,
        { status: 200, headers: { 'Content-Type': 'application/xml', ...corsHeaders } }
      );
    }

    // Find the sender's profile
    const { data: senderProfile, error: senderError } = await supabase
      .from('gw_profiles')
      .select('user_id, first_name, last_name, full_name')
      .eq('phone_number', smsData.From)
      .single();

    if (senderError || !senderProfile) {
      console.error('Sender not found for phone:', smsData.From);
      // Return TwiML response
      return new Response(
        `<Response><Message>You must be a registered member to send messages to this group.</Message></Response>`,
        { status: 200, headers: { 'Content-Type': 'application/xml', ...corsHeaders } }
      );
    }

    // Check if sender is a member of this group
    const { data: membership, error: memberError } = await supabase
      .from('gw_group_members')
      .select('id')
      .eq('group_id', conversation.gw_message_groups.id)
      .eq('user_id', senderProfile.user_id)
      .single();

    if (memberError || !membership) {
      console.error('Sender is not a member of this group');
      return new Response(
        `<Response><Message>You are not a member of this group.</Message></Response>`,
        { status: 200, headers: { 'Content-Type': 'application/xml', ...corsHeaders } }
      );
    }

    // Store the incoming message
    const { data: storedMessage, error: storeError } = await supabase
      .from('gw_sms_messages')
      .insert({
        conversation_id: conversation.id,
        sender_phone: smsData.From,
        sender_user_id: senderProfile.user_id,
        message_body: smsData.Body,
        twilio_message_sid: smsData.MessageSid,
        direction: 'inbound',
        status: 'received'
      })
      .select()
      .single();

    if (storeError) {
      console.error('Error storing incoming message:', storeError);
      return new Response(
        `<Response><Message>Error processing your message.</Message></Response>`,
        { status: 200, headers: { 'Content-Type': 'application/xml', ...corsHeaders } }
      );
    }

    // Get all other group members' phone numbers (excluding the sender)
    const { data: otherMembers, error: otherMembersError } = await supabase
      .from('gw_group_members')
      .select(`
        gw_profiles!inner(phone_number, user_id)
      `)
      .eq('group_id', conversation.gw_message_groups.id)
      .neq('gw_profiles.user_id', senderProfile.user_id)
      .not('gw_profiles.phone_number', 'is', null);

    if (otherMembersError) {
      console.error('Error fetching other group members:', otherMembersError);
    }

    const targetPhoneNumbers = otherMembers
      ?.map(member => member.gw_profiles?.phone_number)
      .filter(phone => phone) as string[] || [];

    // Get Twilio credentials for forwarding message
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');

    if (twilioAccountSid && twilioAuthToken && targetPhoneNumbers.length > 0) {
      // Format forwarded message: "[Group Name] FirstName: original message"
      const firstName = senderProfile.first_name || senderProfile.full_name?.split(' ')[0] || 'Member';
      const groupName = conversation.gw_message_groups.name;
      const forwardedMessage = `${groupName}: ${firstName}: ${smsData.Body}`;
      const truncatedMessage = forwardedMessage.length > 160 ? 
        forwardedMessage.substring(0, 157) + '...' : forwardedMessage;

      // Forward to all other group members
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
      const credentials = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

      const forwardResults = await Promise.allSettled(
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
            console.error(`Failed to forward to ${phoneNumber}:`, errorText);
            throw new Error(`Forward failed for ${phoneNumber}`);
          }

          const result = await response.json();
          console.log(`Message forwarded to ${phoneNumber}:`, result.sid);
          return { phoneNumber, success: true, messageSid: result.sid };
        })
      );

      const successful = forwardResults.filter(result => result.status === 'fulfilled').length;
      const failed = forwardResults.filter(result => result.status === 'rejected').length;

      console.log(`Message forwarded: ${successful} successful, ${failed} failed`);
    }

    // Return empty TwiML response (no reply to sender)
    return new Response(
      `<Response></Response>`,
      { status: 200, headers: { 'Content-Type': 'application/xml', ...corsHeaders } }
    );

  } catch (error: any) {
    console.error('Error in receive-group-sms function:', error);
    
    // Return TwiML error response
    return new Response(
      `<Response><Message>Error processing message. Please try again.</Message></Response>`,
      { status: 200, headers: { 'Content-Type': 'application/xml', ...corsHeaders } }
    );
  }
};

serve(handler);