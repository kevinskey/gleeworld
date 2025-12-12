import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Received SMS webhook:', req.method, req.url);

    // Parse Twilio webhook data
    const formData = await req.formData();
    const smsData = {
      from: formData.get('From') as string,
      to: formData.get('To') as string,
      body: formData.get('Body') as string,
      messageSid: formData.get('MessageSid') as string,
      accountSid: formData.get('AccountSid') as string,
    };

    console.log('SMS received:', smsData);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find user by phone number
    const { data: profile, error: profileError } = await supabase
      .from('gw_profiles')
      .select('user_id, full_name')
      .eq('phone_number', smsData.from)
      .single();

    if (profileError || !profile) {
      console.log('User not found for phone number:', smsData.from);
      
      // Send a response to unknown numbers
      const response = `
        <Response>
          <Message>Thanks for your message! This number is not registered with GleeWorld. Please contact an administrator to register your number.</Message>
        </Response>
      `;
      
      return new Response(response, {
        status: 200,
        headers: { 'Content-Type': 'application/xml', ...corsHeaders }
      });
    }

    // Parse message to determine target group
    // Format expected: "GROUP_NAME: message" or just "message" for default group
    let targetGroupId: string | null = null;
    let messageContent = smsData.body;

    // Check if message contains group reference
    const groupMatch = smsData.body.match(/^([^:]+):\s*(.+)$/);
    if (groupMatch) {
      const groupName = groupMatch[1].trim();
      messageContent = groupMatch[2].trim();

      // Find group by name where user is a member
      const { data: groups, error: groupError } = await supabase
        .from('gw_message_groups')
        .select(`
          id,
          name,
          gw_group_members!inner(user_id)
        `)
        .ilike('name', `%${groupName}%`)
        .eq('gw_group_members.user_id', profile.user_id);

      if (!groupError && groups && groups.length > 0) {
        targetGroupId = groups[0].id;
      }
    }

    // If no specific group found, use the default "General Chat" group
    if (!targetGroupId) {
      const { data: defaultGroup, error: defaultGroupError } = await supabase
        .from('gw_message_groups')
        .select(`
          id,
          gw_group_members!inner(user_id)
        `)
        .eq('name', 'General Chat')
        .eq('gw_group_members.user_id', profile.user_id)
        .single();

      if (!defaultGroupError && defaultGroup) {
        targetGroupId = defaultGroup.id;
      }
    }

    if (!targetGroupId) {
      console.log('No accessible groups found for user');
      
      const response = `
        <Response>
          <Message>You don't have access to any message groups. Please contact an administrator.</Message>
        </Response>
      `;
      
      return new Response(response, {
        status: 200,
        headers: { 'Content-Type': 'application/xml', ...corsHeaders }
      });
    }

    // Insert message into the database
    const { data: newMessage, error: messageError } = await supabase
      .from('gw_group_messages')
      .insert({
        group_id: targetGroupId,
        user_id: profile.user_id,
        content: `📱 ${messageContent}`, // SMS indicator
        message_type: 'text'
      })
      .select()
      .single();

    if (messageError) {
      console.error('Error inserting message:', messageError);
      throw new Error('Failed to save message');
    }

    console.log('Message saved successfully:', newMessage.id);

    // Send confirmation SMS
    const response = `
      <Response>
        <Message>Message received and posted to group chat!</Message>
      </Response>
    `;

    return new Response(response, {
      status: 200,
      headers: { 'Content-Type': 'application/xml', ...corsHeaders }
    });

  } catch (error: any) {
    console.error('Error in receive-sms function:', error);
    
    const errorResponse = `
      <Response>
        <Message>Sorry, there was an error processing your message. Please try again.</Message>
      </Response>
    `;
    
    return new Response(errorResponse, {
      status: 200,
      headers: { 'Content-Type': 'application/xml', ...corsHeaders }
    });
  }
};

serve(handler);