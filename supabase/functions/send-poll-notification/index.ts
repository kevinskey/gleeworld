import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface PollNotificationRequest {
  groupId: string;
  pollQuestion: string;
  creatorUserId: string;
  creatorName: string;
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

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
  const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
  const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Missing Supabase config" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    return new Response(JSON.stringify({ error: "Missing Twilio config" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  try {
    const { groupId, pollQuestion, creatorUserId, creatorName }: PollNotificationRequest = await req.json();
    
    console.log('Processing poll notification:', { groupId, creatorName, pollQuestion: pollQuestion.substring(0, 50) });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get group name
    const { data: group, error: groupError } = await supabase
      .from('gw_message_groups')
      .select('name')
      .eq('id', groupId)
      .single();

    if (groupError || !group) {
      throw new Error('Group not found');
    }

    // Get all group members with phone numbers (except creator)
    const { data: members, error: membersError } = await supabase
      .from('gw_group_members')
      .select(`
        user_id,
        gw_profiles!inner(phone_number, full_name)
      `)
      .eq('group_id', groupId)
      .neq('user_id', creatorUserId)
      .not('gw_profiles.phone_number', 'is', null);

    if (membersError) {
      console.error('Error fetching members:', membersError);
      throw new Error('Failed to get group members');
    }

    const targetMembers = members
      .filter(m => m.gw_profiles?.phone_number)
      .map(m => ({
        phone: formatPhoneNumber(m.gw_profiles.phone_number as string),
        name: m.gw_profiles.full_name || 'Member'
      }));

    if (targetMembers.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No members with phone numbers to notify',
        sent: 0 
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Create SMS message
    const truncatedQuestion = pollQuestion.length > 80 ? pollQuestion.substring(0, 77) + '...' : pollQuestion;
    const smsMessage = `📊 ${group.name}: New poll from ${creatorName.split(' ')[0]}!\n"${truncatedQuestion}"\nVote now in GleeWorld!`;

    // Send SMS to all members via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const credentials = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

    const results = await Promise.allSettled(
      targetMembers.map(async (member) => {
        const formData = new URLSearchParams();
        formData.append('From', TWILIO_PHONE_NUMBER);
        formData.append('To', member.phone);
        formData.append('Body', smsMessage);

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
          console.error(`SMS failed for ${member.phone}:`, errorText);
          throw new Error(`Failed to send to ${member.phone}`);
        }

        const result = await response.json();
        console.log(`Poll notification sent to ${member.phone}:`, result.sid);
        return { phone: member.phone, success: true };
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`Poll notifications sent: ${successful} successful, ${failed} failed`);

    return new Response(JSON.stringify({
      success: true,
      sent: successful,
      failed: failed,
      total: targetMembers.length
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error('Error in send-poll-notification:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
};

serve(handler);
