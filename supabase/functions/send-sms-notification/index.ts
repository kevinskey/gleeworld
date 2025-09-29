import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, cache-control, pragma',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

interface SMSNotificationRequest {
  groupId?: string | null;
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

    console.log('🔧 SMS Notification Function - Starting execution...');
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

    console.log('Twilio credentials check:', {
      accountSid: twilioAccountSid ? 'CONFIGURED' : 'MISSING',
      authToken: twilioAuthToken ? 'CONFIGURED' : 'MISSING', 
      phoneNumber: twilioPhoneNumber ? 'CONFIGURED' : 'MISSING'
    });

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      console.error('❌ Missing Twilio credentials:', {
        accountSid: twilioAccountSid ? 'SET' : 'MISSING',
        authToken: twilioAuthToken ? 'SET' : 'MISSING',
        phoneNumber: twilioPhoneNumber ? 'SET' : 'MISSING'
      });
      throw new Error('Twilio credentials not configured');
    }

    let targetPhoneNumbers = phoneNumbers;
    let groupName = 'Glee Club';

    // If groupId is provided and valid, get group details and member phone numbers
    if (groupId && groupId !== 'null') {
      const { data: group, error: groupError } = await supabase
        .from('gw_message_groups')
        .select('name')
        .eq('id', groupId)
        .single();

      if (!groupError && group) {
        groupName = group.name;
        
        // Get phone numbers from group members if not provided
        if (!targetPhoneNumbers || targetPhoneNumbers.length === 0) {
          const { data: members, error: membersError } = await supabase
            .from('gw_group_members')
            .select(`
              gw_profiles!fk_gw_group_members_user_profile(phone_number)
            `)
            .eq('group_id', groupId)
            .not('gw_profiles.phone_number', 'is', null);

          if (!membersError && members) {
            targetPhoneNumbers = members
              .map(member => member.gw_profiles?.phone_number)
              .filter(phone => phone) as string[];
          }
        }
      }
    }

    // If phoneNumbers are provided as user IDs, convert them to actual phone numbers
    if (targetPhoneNumbers && targetPhoneNumbers.length > 0) {
      // Check if the first item looks like a UUID (user ID)
      const firstNumber = targetPhoneNumbers[0];
      if (firstNumber.includes('-') && firstNumber.length === 36) {
        // These are user IDs, fetch phone numbers
        const { data: profiles, error: profilesError } = await supabase
          .from('gw_profiles')
          .select('phone_number')
          .in('user_id', targetPhoneNumbers)
          .not('phone_number', 'is', null);

        if (!profilesError && profiles) {
          targetPhoneNumbers = profiles
            .map(profile => profile.phone_number)
            .filter(phone => phone) as string[];
        }
      }
    }

    if (!targetPhoneNumbers || targetPhoneNumbers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No phone numbers to notify' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Format SMS message
    const smsText = `${groupName}: ${senderName}: ${message}`;
    const truncatedMessage = smsText.length > 160 ? smsText.substring(0, 157) + '...' : smsText;

    // Send SMS notifications using Twilio API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

    const results = await Promise.allSettled(
      targetPhoneNumbers.map(async (phoneNumber) => {
        console.log(`📱 Attempting to send SMS to: ${phoneNumber}`);
        
        const formData = new URLSearchParams();
        formData.append('From', twilioPhoneNumber);
        formData.append('To', phoneNumber);
        formData.append('Body', truncatedMessage);

        console.log(`🔧 Twilio request data:`, {
          from: twilioPhoneNumber,
          to: phoneNumber,
          body: truncatedMessage,
          url: twilioUrl
        });

        const response = await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData,
        });

        const responseText = await response.text();
        console.log(`📡 Twilio response for ${phoneNumber}:`, {
          status: response.status,
          statusText: response.statusText,
          body: responseText
        });

        if (!response.ok) {
          let errorDetails;
          try {
            errorDetails = JSON.parse(responseText);
          } catch {
            errorDetails = { message: responseText };
          }
          
          console.error(`❌ Twilio API error for ${phoneNumber}:`, {
            status: response.status,
            statusText: response.statusText,
            error: errorDetails
          });
          
          throw new Error(`Twilio API error: ${JSON.stringify(errorDetails)}`);
        }

        const result = JSON.parse(responseText);
        console.log(`✅ SMS sent successfully to ${phoneNumber}:`, result.sid);
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