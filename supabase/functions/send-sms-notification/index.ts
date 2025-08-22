import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SMSNotificationRequest {
  groupId: string;
  message: string;
  senderName: string;
  phoneNumbers?: string[];
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { groupId, message, senderName, phoneNumbers }: SMSNotificationRequest = await req.json();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get Twilio credentials
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

    console.log('Twilio credentials check:', {
      accountSid: twilioAccountSid ? 'CONFIGURED' : 'MISSING',
      authToken: twilioAuthToken ? 'CONFIGURED' : 'MISSING', 
      phoneNumber: twilioPhoneNumber ? 'CONFIGURED' : 'MISSING'
    });

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      throw new Error('Twilio credentials not configured');
    }

    // Get group details
    const { data: group, error: groupError } = await supabase
      .from('gw_message_groups')
      .select('name')
      .eq('id', groupId)
      .single();

    if (groupError) {
      throw new Error(`Failed to get group details: ${groupError.message}`);
    }

    // Get phone numbers from group members if not provided
    let targetPhoneNumbers = phoneNumbers;
    if (!targetPhoneNumbers || targetPhoneNumbers.length === 0) {
      const { data: members, error: membersError } = await supabase
        .from('gw_group_members')
        .select(`
          gw_profiles!fk_gw_group_members_user_profile(phone_number)
        `)
        .eq('group_id', groupId)
        .not('gw_profiles.phone_number', 'is', null);

      if (membersError) {
        console.error('Error fetching member phone numbers:', membersError);
      } else {
        targetPhoneNumbers = members
          .map(member => member.gw_profiles?.phone_number)
          .filter(phone => phone) as string[];
      }
    }

    if (!targetPhoneNumbers || targetPhoneNumbers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No phone numbers to notify' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Format SMS message
    const smsText = `${group.name}: ${senderName}: ${message}`;
    const truncatedMessage = smsText.length > 160 ? smsText.substring(0, 157) + '...' : smsText;

    // Send SMS notifications using Twilio API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

    const results = await Promise.allSettled(
      targetPhoneNumbers.map(async (phoneNumber) => {
        const formData = new URLSearchParams();
        formData.append('From', twilioPhoneNumber);
        formData.append('To', phoneNumber);
        formData.append('Body', truncatedMessage);

        const response = await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData,
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Twilio API error: ${error}`);
        }

        const result = await response.json();
        console.log(`SMS sent to ${phoneNumber}:`, result.sid);
        return { phoneNumber, success: true, messageSid: result.sid };
      })
    );

    // Log results
    const successful = results.filter(result => result.status === 'fulfilled').length;
    const failed = results.filter(result => result.status === 'rejected').length;

    console.log(`SMS notifications sent: ${successful} successful, ${failed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
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
    console.error('Error in send-sms-notification function:', error);
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